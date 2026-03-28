

model_id = ["tensortrt/Scout-fp8"]


def tensorrt_run(model, device):
    from tensorrt_llm import LLM, SamplingParams

    def load():
        llm = LLM(
            model="nvidia/Llama-4-Scout-17B-16E-Instruct-FP8", 
            attn_backend="FLASHINFER", 
            backend="pytorch", 
            tensor_parallel_size=1
        )

        def run(prompt: str):
            sampling_params = SamplingParams(temperature=0.8, top_p=0.95)
            return llm.generate(prompt, sampling_params)

        return run

    return load