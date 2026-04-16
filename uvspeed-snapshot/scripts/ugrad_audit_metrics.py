import json
import os
import sys
from deepeval.metrics import AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

def audit_data(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, 'r') as f:
        lines = f.readlines()

    metric = AnswerRelevancyMetric(threshold=0.7)
    results = []

    # Audit a sample of 5 rows for performance
    sample_size = min(len(lines), 5)
    for i in range(sample_size):
        try:
            data = json.loads(lines[i])
            # Construct a test case: Does the input match the label's logic?
            test_case = LLMTestCase(
                input=str(data['input']),
                actual_output=str(data['label']),
                retrieval_context=["Logic: Label 1 if center is controlled (index 4 is 1) or diagonal threats exist."]
            )
            metric.measure(test_case)
            results.append({
                "index": i,
                "score": metric.score,
                "reason": metric.reason
            })
        except Exception as e:
            results.append({"index": i, "error": str(e)})

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        audit_data(sys.argv[1])
    else:
        print("Usage: python ugrad_audit_metrics.py <jsonl_file>")
