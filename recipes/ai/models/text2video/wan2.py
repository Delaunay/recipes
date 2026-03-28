
import torch

def load():
    from diffusers import WanPipeline, AutoencoderKLWan
    model_id = "Wan-AI/Wan2.2-T2V-A14B-Diffusers"
    dtype = torch.bfloat16

    dtype = torch.bfloat16
    device = "cuda"
    vae = AutoencoderKLWan.from_pretrained(
        model_id, 
        subfolder="vae",
        torch_dtype=torch.float32,
        device_map="cuda"
    )
    pipe = WanPipeline.from_pretrained(
        model_id, 
        vae=vae, 
        torch_dtype=dtype,
        device_map="cuda"
    )
    
    # pipe.to(device)

    return pipe