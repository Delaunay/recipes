import torch

model_id = ["lodestones/Chroma1-Base"]


def load(model_name):
    import torch
    from diffusers import ChromaPipeline

    pipe = ChromaPipeline.from_pretrained(
        model_name,
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
            latents = (latents / pipe.vae.config.scaling_factor) + pipe.vae.config.shift_factor
            
            image = pipe.vae.decode(latents, return_dict=False)[0]
            pil = pipe.image_processor.postprocess(image, output_type="pil")

            image_data_url = [f"data:image/png;base64,{pil_to_base64_png(p)}" for p in pil]

            app.message("preview", {"id": action_id, "thread_id": 0, "images": image_data_url})
    
    return _