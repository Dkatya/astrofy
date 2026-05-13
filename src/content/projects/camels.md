---
title: "CAMELS — Multimodal latent space for human–AI interaction"
description: "Research project building a real-time multimodal understanding pipeline that fuses what someone is doing on video, the phonemes they're producing, and the prosody of their voice into a single shared latent space, so a conversational AI can react to all three jointly."
tldr: "Three independent signals (face/landmark video, phoneme stream, and prosody) are projected into a single 768-D shared latent space, trained with a three-stage curriculum (contrastive alignment → reconstruction → flow matching) so an agent can attend to all three modalities jointly in real time. The team's most recent result: a latent-space response decoder reaches 0.97 cosine similarity to ground-truth responses on IEMOCAP after 5 epochs, vs. 0.54 for a GPT-2 + LoRA text-only baseline."
status: "Active research"
stack: ["Python", "PyTorch", "wav2vec2", "MediaPipe FaceMesh", "librosa", "t-SNE / UMAP", "conda"]
image: "/post_img.webp"
githubUrl: "https://github.com/Dkatya/camels-multimodal-encoders"
badge: "Team · Research"
category: "Research"
order: 1
---

## The question

Most conversational AI today is text-first: a transcript goes in, a response comes out. That works in chat. It fails in video calls — where the meaningful signal isn't just what the person said, it's *how they said it* (prosody), *which sounds they actually made* (phoneme stream, not the cleaned-up transcript), and *what their face is doing* (subtle motion, gaze, expression). The CAMELS research project asks: can we project all three of those signals — video, phoneme, prosody — into a **single shared latent space** that a downstream agent can attend to jointly, in real time, without first collapsing everything to text?

This is a **team capstone research project**. The training infrastructure and core encoder–adapter architecture are led by Watson Blair; I'm one of the contributors building on top of the trained latent space (see *My contribution* below).

## The data

| Dataset | What it gives us |
|---|---|
| **Seamless Interaction** (Meta) | 4,000+ hours of in-person face-to-face interaction with synchronized video and audio |
| **CANDOR** corpus | 1,650 video chat conversations between strangers with rich behavioural metadata |
| **L2-Arctic** | 26,867 utterances from 24 non-native English speakers, used for phoneme-pipeline evaluation |

For benchmarks the project uses **CMU-MOSEI** (sentiment + emotion), **VGGSound** (audio-visual retrieval), **MER2025** (Chinese emotion recognition), and **MELD** (multimodal dialogue emotion).

## The architecture

Three frozen pretrained encoders, each followed by a thin learnable adapter that projects into the shared **768-D** latent space:

| Modality | Frozen encoder | Output shape | Adapter |
|---|---|---|---|
| Video (face/landmarks) | Selectable; default `facemesh_landmarks` | `(d_video,)` | AVAEAdapter |
| Phoneme | `wav2vec2-lv-60-espeak-cv-ft` (CTC) | `(MAX_PHONES, 1024)` | PhonemeAdapter + PhonemeAttnPool |
| Prosody | librosa 22-dim hand-engineered features | `(22,)` | AVAEAdapter |

The design pattern is "Adapted Pretrained Encoders" (APE): never re-train the heavy pretrained models, only learn the small adapters that bring them into a common representation.

## The training curriculum

Adapter training proceeds in three stages, then a fourth stage trains downstream agents:

1. **Stage A — Contrastive alignment.** Adapters learn that the video / phoneme / prosody embeddings of the *same* moment in time should sit close in latent space, while embeddings from unrelated moments should sit far apart.
2. **Stage B — Adds AVAE reconstruction.** Each adapter is asked to also reconstruct its own input from the latent, regularising the latent so it actually carries the information.
3. **Stage C — Adds bidirectional flow matching.** Forces consistency between modalities at the latent level — if you know the prosody embedding, you should be able to flow to a plausible video embedding for the same moment.
4. **Stage D — Conversational agent.** With the latent space frozen, a downstream agent learns to operate inside it. The most recent finding here (Phase D1.5, validated April 2026) is that a **lightweight latent-space response decoder** beats a GPT-2 + LoRA text-only baseline by a large margin (cosine-sim **0.97 vs 0.54** at epoch 5 on a 20-dialogue IEMOCAP comparison), while being 1.2× faster per epoch and removing the external text-model dependency entirely.

## My contribution

The training infrastructure, encoder architecture, and curriculum are a team effort. My specific contributions, all visible in the repo's commit history, are:

- **Latent-space visualization** (PR 6): t-SNE and UMAP projections of the 768-D latent across modalities and across training stages, used to qualitatively diagnose alignment between video / phoneme / prosody embeddings at each curriculum stage.
- **Stage D evaluation reports**: per-phase plots and landmark-motion latent t-SNE used to track whether the downstream agent's response embeddings drift away from the speaker-conditioned latent.
- **Documentation and design**: post-facto architecture audit, a Docusaurus documentation site bootstrap, and a packaging roadmap so the encoders can eventually be consumed externally.

In analyst-language: the team builds the model; my contribution is *making it interpretable and consumable* — both for the team (visualizations during training) and for the outside world (docs, packaging design).

## Visualizations

> ![placeholder — t-SNE / UMAP of latent space across modalities](/projects/camels-latent-tsne.png)
>
> *Chart to drop in: from PR 6 (`feat(viz): latent-space t-SNE / UMAP`). Two side-by-side panels — left = early-stage latent (modalities sit in separate clusters), right = post-Stage-C latent (modalities collapse into a shared manifold). This is the qualitative evidence that contrastive + flow matching is doing what we claim.*

## Why this matters

For real-time human–AI interaction (video meetings, accessibility tools, mental-health screening), the latent-space approach has three concrete advantages over today's transcript-first pipelines:

1. **Latency.** Text-first systems wait for an ASR pass before they can react. A shared-latent system reacts to the prosody and face *as the speaker is still talking*.
2. **Robustness.** When ASR fails (accents, overlapping speech, low-bandwidth audio), text-first systems silently lose all signal. CAMELS still has video and prosody.
3. **Bandwidth.** A 768-D vector per timestep is dramatically cheaper than streaming raw video + audio to a downstream model.

## Limitations

- The encoders are frozen pretrained models — biases and failure modes baked into wav2vec2 and FaceMesh propagate downstream.
- Evaluation is currently dominated by retrieval-style metrics; ecological validity in actual live calls is still ahead of us.
- The 22-dim hand-engineered prosody adapter is the weakest link; a learned prosody encoder is a likely future direction.

## Links

- [`Dkatya/camels-multimodal-encoders`](https://github.com/Dkatya/camels-multimodal-encoders) — public companion describing the encoder architecture.
- The full training codebase (`WatsonWBlair/LSCA`) is private while the work is unpublished.
