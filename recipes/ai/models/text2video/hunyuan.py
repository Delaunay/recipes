
import torch



def load():
    from diffusers import HunyuanVideoPipeline
    from diffusers import HunyuanVideo15Pipeline

    dtype = torch.bfloat16
    device = "cuda"

    
    # pipe = HunyuanVideoPipeline.from_pretrained(default_model, torch_dtype=torch.bfloat16)
    # pipe.enable_model_cpu_offload()
    # pipe.vae.enable_tiling()
    pipe = HunyuanVideo15Pipeline.from_pretrained(
        "hunyuanvideo-community/HunyuanVideo-1.5-Diffusers-720p_t2v",
        torch_dtype=dtype,
        device_map="cuda"
    )
    # pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()
    pipe.to(device)
    return pipe