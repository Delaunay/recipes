import torch

model_id = ["purplesmartai/pony-v7-base"]


def load(model_name):
    import torch
    from diffusers import BitsAndBytesConfig as DiffusersBitsAndBytesConfig, AuraFlowTransformer2DModel, AuraFlowPipeline
    from transformers import BitsAndBytesConfig as BitsAndBytesConfig, UMT5EncoderModel

    # quant_config = BitsAndBytesConfig(load_in_8bit=True)
    text_encoder_8bit = UMT5EncoderModel.from_pretrained(
        model_name,
        subfolder="text_encoder",
        # quantization_config=quant_config,
        torch_dtype=torch.bfloat16,
        device_map="cuda",
    )

    quant_config = DiffusersBitsAndBytesConfig(load_in_8bit=True)
    transformer_8bit = AuraFlowTransformer2DModel.from_pretrained(
        model_name,
        subfolder="transformer",
        # quantization_config=quant_config,
        torch_dtype=torch.bfloat16,
        device_map="cuda",
    )

    pipe = AuraFlowPipeline.from_pretrained(
        model_name,
        text_encoder=text_encoder_8bit,
        transformer=transformer_8bit,
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
            needs_upcasting = pipe.vae.dtype == torch.float16 and pipe.vae.config.force_upcast

            if needs_upcasting:
                pipe.upcast_vae()
                latents = latents.to(next(iter(pipe.vae.post_quant_conv.parameters())).dtype)

            image = pipe.vae.decode(latents / pipe.vae.config.scaling_factor, return_dict=False)[0]
            pil = pipe.image_processor.postprocess(image, output_type="pil")

            image_data_url = [f"data:image/png;base64,{pil_to_base64_png(p)}" for p in pil]

            app.message("preview", {"id": action_id, "thread_id": 0, "images": image_data_url})
    
    return _
