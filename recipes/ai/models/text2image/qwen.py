import torch


model_id = ["Qwen/Qwen-Image"]


def load(model_name):
    from diffusers import DiffusionPipeline

    pipe = DiffusionPipeline.from_pretrained(
        model_name, 
        torch_dtype=torch.bfloat16,
        device_map="cuda",
    )

    return pipe



def on_step_end(app, action_id, generation_args):
    from assai.tools import pil_to_base64_png

    def _(pipe, step, timestep, callback_kwargs):
        latents = callback_kwargs["latents"]

        height, width = generation_args["height"], generation_args["width"]

        with torch.no_grad():
            latents = pipe._unpack_latents(latents, height, width, pipe.vae_scale_factor)
            latents = latents.to(pipe.vae.dtype)
            latents_mean = (
                torch.tensor(pipe.vae.config.latents_mean)
                .view(1, pipe.vae.config.z_dim, 1, 1, 1)
                .to(latents.device, latents.dtype)
            )
            latents_std = 1.0 / torch.tensor(pipe.vae.config.latents_std).view(1, pipe.vae.config.z_dim, 1, 1, 1).to(
                latents.device, latents.dtype
            )
            latents = latents / latents_std + latents_mean
            image = pipe.vae.decode(latents, return_dict=False)[0][:, :, 0]
            pil = pipe.image_processor.postprocess(image, output_type="pil")

            image_data_url = [f"data:image/png;base64,{pil_to_base64_png(p)}" for p in pil]

            app.message("preview", {"id": action_id, "thread_id": 0, "images": image_data_url})
    
    return _