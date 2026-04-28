
import os
import sys
from google.cloud import bigquery
from google.oauth2 import service_account

# Add backend to path for services/api imports if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def setup_bigquery():
    project_id = "edu-alloc"
    dataset_id = f"{project_id}.edualloc_dataset"
    location = "us-central1"
    key_path = "./Secrets/service-account.json"
    sql_path = "./data/schema/create_tables.sql"

    print(f"--- Initializing BigQuery for project: {project_id} ---")

    # Load credentials
    if not os.path.exists(key_path):
        print(f"Error: {key_path} not found.")
        return

    credentials = service_account.Credentials.from_service_account_file(key_path)
    client = bigquery.Client(project=project_id, credentials=credentials)

    # 1. Create Dataset
    dataset = bigquery.Dataset(dataset_id)
    dataset.location = location
    try:
        client.create_dataset(dataset, exists_ok=True)
        print(f"Dataset {dataset_id} is ready.")
    except Exception as e:
        print(f"Error creating dataset: {e}")
        return

    # 2. Run SQL Schema
    if not os.path.exists(sql_path):
        print(f"Error: {sql_path} not found.")
        return

    with open(sql_path, "r") as f:
        sql_content = f.read()

    # Split the SQL by semicolon if necessary, or just run it as one block if BQ supports it.
    # BQ supports multiple statements in one query call.
    print("Running DDL schema...")
    try:
        query_job = client.query(sql_content)
        query_job.result()  # Wait for completion
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error running SQL schema: {e}")

if __name__ == "__main__":
    setup_bigquery()
