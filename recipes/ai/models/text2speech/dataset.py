# coding=utf-8

import os
import numpy as np
import datasets


_DATA_URL = "https://huggingface.co/datasets/Matthijs/cmu-arctic-xvectors/resolve/main/spkrec-xvect.zip"


class ArcticXvectors(datasets.GeneratorBasedBuilder):

    BUILDER_CONFIGS = [
        datasets.BuilderConfig(
            name="default",
            version=datasets.Version("0.0.1", ""),
            description="",
        )
    ]

    def _info(self):
        return datasets.DatasetInfo(
            features=datasets.Features(
                {
                    "filename": datasets.Value("string"),
                    "xvector": datasets.Sequence(feature=datasets.Value(dtype="float32"), length=512),
                }
            ),
        )

    def _split_generators(self, dl_manager):
        archive = os.path.join(dl_manager.download_and_extract(_DATA_URL), "spkrec-xvect")
        return [
            datasets.SplitGenerator(
                name=datasets.Split.VALIDATION, gen_kwargs={"files": dl_manager.iter_files(archive)}
            ),
        ]

    def _generate_examples(self, files):
        for i, file in enumerate(sorted(files)):
            if os.path.basename(file).endswith(".npy"):
                yield str(i), {
                    "filename": os.path.basename(file)[:-4],  # strip off .npy
                    "xvector": np.load(file),
                }



def fetch(id=7306):
    from datasets import DownloadManager

    builder = ArcticXvectors()
    dl_manager = DownloadManager()
    splits = builder._split_generators(dl_manager)

    split = splits[0]
    files = split.gen_kwargs["files"]
    examples = list(builder._generate_examples(files))

    _, data = examples[id]
    return data["xvector"]
