import torch
from transformers import pipeline


def load(model):
    # Use transformers pipeline for text generation
    pipe = pipeline(
        "text-generation",
        model=model,
        device="cuda",
        torch_dtype=torch.bfloat16
    )
    return pipe
