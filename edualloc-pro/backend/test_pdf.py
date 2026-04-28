"""Test Marathi PDF generation with the embedded Devanagari font."""
import sys
sys.path.insert(0, '.')

from utils.pdf_generator import generate_deployment_order_pdf, _DEVANAGARI_AVAILABLE

print(f"Devanagari font available: {_DEVANAGARI_AVAILABLE}")

mock_narrative = {
    "order_number": "NDB/DEO/2026/TEST0001",
    "narrative": "This order directs the deployment of qualified teachers to high-deprivation schools in Nandurbar district as identified by the EduAllocPro intelligence system.",
    "marathi_narrative": "हे आदेश नंदुरबार जिल्ह्यातील उच्च वंचनता असलेल्या शाळांमध्ये पात्र शिक्षकांच्या नियुक्तीसाठी आहे. एज्युअॅलोकप्रो प्रणालीद्वारे ओळखल्यानुसार.",
    "effective_date": "2026-05-10",
    "signed_by": "District Education Officer, Nandurbar",
}

pdf_bytes = generate_deployment_order_pdf(mock_narrative, "NDB01", "test-uuid-0001")
with open("test_output.pdf", "wb") as f:
    f.write(pdf_bytes)

print(f"PDF generated: {len(pdf_bytes)} bytes → test_output.pdf")
print("Open test_output.pdf to verify Marathi text renders correctly.")
