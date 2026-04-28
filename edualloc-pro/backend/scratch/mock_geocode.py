import os
import json
import random
import sys
from google.cloud import bigquery
import tempfile

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

MIN_LAT, MAX_LAT = 21.0, 21.9
MIN_LNG, MAX_LNG = 73.8, 74.5

def main():
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "edu-alloc")
    dataset_id = os.environ.get("BQ_DATASET", "edualloc_dataset")
    
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.{dataset_id}.schools"
    
    print(f"Fetching schools from {table_id}...")
    query = f"SELECT * FROM `{table_id}`"
    schools_df = client.query(query).to_dataframe()
    
    print(f"Found {len(schools_df)} schools. Assigning mock coordinates...")
    
    def mock_lat(val): return random.uniform(MIN_LAT, MAX_LAT)
    def mock_lng(val): return random.uniform(MIN_LNG, MAX_LNG)
    
    schools_df['lat'] = schools_df['lat'].apply(mock_lat)
    schools_df['lng'] = schools_df['lng'].apply(mock_lng)
    schools_df['geocode_status'] = 'OK'
    schools_df['geocode_address'] = 'Mocked Nandurbar Location'
    
    # Ensure datetimes are strings for JSON
    for col in schools_df.select_dtypes(include=['datetime64[ns]', 'datetime64[ns, UTC]']).columns:
        schools_df[col] = schools_df[col].dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        
    records = schools_df.to_dict(orient='records')
    
    print("Loading back into BigQuery via WRITE_TRUNCATE...")
    
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".jsonl") as f:
        for r in records:
            clean_r = {k: v for k, v in r.items() if v is not None and str(v) != 'nan' and str(v) != 'NaT'}
            f.write(json.dumps(clean_r) + "\n")
        tmp_path = f.name
        
    try:
        job_config = bigquery.LoadJobConfig(
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
            write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
            autodetect=False, # Use existing schema
        )
        with open(tmp_path, "rb") as source_file:
            job = client.load_table_from_file(source_file, table_id, job_config=job_config)
            job.result()
        print(f"Successfully mocked coordinates for {job.output_rows} rows.")
    finally:
        os.remove(tmp_path)

if __name__ == "__main__":
    main()
