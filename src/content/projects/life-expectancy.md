---
title: "Life Expectancy — country-grouped cross-validation"
description: "When does a 0.95 R² mean your model works, and when does it mean your validation leaked? A WDI panel-data study that started as a coursework project and turned into a methodological correction submitted to IEEE GHTC 2026."
tldr: "On WDI country–year panel data, Random Forest hits 0.95 R² under naive random k-fold cross-validation — but that number is largely leakage, not generalization. The core contribution is replacing random k-fold with country-grouped CV (no country appears in both train and validation) and quantifying how much of the apparent performance was memorization of country baselines."
status: "Under review · IEEE GHTC 2026"
stack: ["Python", "pandas", "scikit-learn", "statsmodels", "matplotlib", "seaborn", "plotly", "World Bank WDI"]
image: "/post_img.webp"
githubUrl: "https://github.com/Dkatya/lifexp-ieee-ghtc-2026"
badge: "Submitted"
category: "Research"
order: 2
---

## The question

What socioeconomic conditions predict a country's life expectancy at birth — and more importantly, *can a model trained on one set of countries generalize to a country it has never seen?* The second question is the one almost every published cross-country ML study leaves unanswered, because the standard "random 80/20 split" implicitly assumes every country–year row is exchangeable. It isn't. Rows from the same country are deeply correlated across years, and a model that "predicts" Norway in 2017 after training on Norway 2000–2016 isn't really predicting anything; it's interpolating.

Started as a team coursework project on life-expectancy modelling. I continued the work solo, and the cross-validation correction below is fully my own contribution.

## The data

World Bank's **World Development Indicators (WDI)** public-use file: 8.96M long-format observations across 1,400+ indicators and ~200 country codes from 1960 onward. After filtering out regional aggregates (EU, Africa-Eastern, etc.) and restricting to the year 2000+, I retained the country–year panel with **nine socioeconomic predictors**:

| Feature | Why it's there |
|---|---|
| log GDP per capita | Preston curve — the classic income / life-expectancy relationship |
| Fertility rate | Inverse demographic transition signal |
| Urban population % | Proxy for service access and infrastructure |
| log Population | Absorbs scale effects |
| log CO₂ per capita | Industrialisation / energy use |
| Health expenditure (% of GDP) | Direct investment in the outcome |
| Physicians per 1,000 | Healthcare capacity |
| Basic drinking-water access (%) | Sanitation, infant mortality driver |
| Lower-secondary completion (%) | Education proxy, especially for women |

Target: life expectancy at birth (years).

## What I found

Under **naive random 5-fold CV** (rows shuffled, no group constraint):

| Model | Val MAE | Val RMSE | Val R² |
|---|---|---|---|
| OLS Baseline | 2.51 | 3.51 | **0.809** |
| LASSO (α = 0.0066) | 2.50 | 3.51 | **0.809** |
| Elastic Net (α = 0.0094, l1 = 0.7) | 2.50 | 3.51 | **0.809** |
| Ridge (α = 10) | 2.50 | 3.51 | **0.809** |
| SVR (RBF, C = 20, γ = 0.01) | 1.29 | 2.38 | **0.912** |
| **Random Forest** | **1.10** | **1.80** | **0.950** |

The headline result hiding inside this table is the **gap between linear models and Random Forest**. The four linear models all converge on R² ≈ 0.81 — they're capturing the macroscopic relationship (richer, better-educated, better-healthcare = longer lives) and nothing else. Random Forest jumps to R² ≈ 0.95 because it can also memorize country-specific patterns: *Sweden in 2014 looks a lot like Sweden in 2015*. That memorization is what naive k-fold rewards. It is exactly what country-grouped CV is designed to penalise.

> ![placeholder — chart: model R² under random k-fold vs country-grouped k-fold](/projects/life-expectancy-cv-comparison.png)
>
> *Chart to add: bar plot, model on x-axis, two grouped bars per model (random CV vs country-grouped CV), showing that the linear-model bars are roughly equal and the tree-model bars collapse under country-grouped CV. This is the single most important figure in the project — when finalised, it goes here.*

## How I got there

Pipeline in short:

1. **Reshape** WDI from wide (year columns) to long, melt to one row per country × year × indicator, drop missing values.
2. **Filter to actual countries**, exclude regional aggregates (which would otherwise double-count).
3. **Pivot to a country–year wide table** with the nine indicators above as columns, target = life expectancy.
4. **Log-transform** GDP per capita, total population, and CO₂ per capita (all right-skewed, mechanistically multiplicative).
5. **Standardise** features inside the train fold, never globally (avoiding the most common quiet leakage).
6. **Compare seven models**: OLS, LASSO, Elastic Net, Ridge (each with internal 5-fold CV for the regularisation hyperparameter), SVR-RBF (grid search), Random Forest, SGD. Reported on a held-out validation split first; CV scheme comparison is the methodological extension.
7. **Cross-validation scheme analysis**: re-run the model comparison under (a) random 5-fold, (b) `GroupKFold(groups=country_code)`. Manuscript reports the delta.

Methodological frame draws on Roberts et al. (2017) on CV for data with temporal/spatial/hierarchical structure, and Cawley & Talbot (2010) on optimistic bias in model selection with nested CV.

## What it means

For cross-country health-policy modelling, the practical takeaway is uncomfortably simple: **if you don't hold out entire countries, your validation R² is approximately a lie**. The model wasn't tested on Bolivia; it was tested on a 2017 Bolivia row after seeing 2016 Bolivia at training time. A policy-maker reading a published 0.95 R² and inferring "this model will help us forecast life expectancy in countries we don't have data for" is being misled by the validation methodology, not by the model.

Beyond CV, the linear-model coefficient analysis surfaces the consistent winners: **basic drinking-water access, lower-secondary completion, and health expenditure share** carry weight even when GDP is in the model. That is policy-relevant — those are the levers a government actually pulls, whereas "raise GDP per capita" isn't.

The supporting clustering analysis identified **over-performers** (countries with higher life expectancy than their GDP per capita predicts): Maldives, Albania, Costa Rica, Lebanon, Bosnia and Herzegovina, Jordan, Spain, Thailand. These are the cases worth case-studying for what they do differently with limited resources.

## Limitations

- Cross-sectional / panel structure with no instrumental variation — these are conditional predictions, not causal claims. "Higher water access predicts higher life expectancy" is not "build wells".
- WDI has uneven missingness; the final modelling set drops country–years with any of the nine features missing, biasing slightly toward better-measured countries.
- The naive-vs-grouped CV comparison was retrofitted onto a coursework pipeline; ideally the entire pipeline (including feature selection) is wrapped in the outer CV split, and I'm tightening that for the manuscript revision.

## Status

Manuscript under submission to **IEEE GHTC 2026** (Global Humanitarian Technology Conference). The [project repository](https://github.com/Dkatya/lifexp-ieee-ghtc-2026) is private until publication; the link will become public on acceptance.
