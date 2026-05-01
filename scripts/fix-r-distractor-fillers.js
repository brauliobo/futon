#!/usr/bin/env node
// Replace common short filler distractors in biology/R sets with longer, topic-adjacent
// alternatives. Each replacement set is length-varied so the correct answer is no longer
// the obvious longest choice. Each variant pool reads as a plausible biomedical near-miss
// so distractors and correct read as siblings.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const POOLS = {
  // Generic "only X / no Y / banned / paradox" fillers, with multiple variants
  // chosen so different occurrences in the same set don't collide.
  'Apenas teórico': [
    'Strictly theoretical observation that has never been validated in randomized human trials',
    'Hypothesis-only proposal lacking any preclinical efficacy data to date',
    'Mechanistic conjecture supported only by isolated case reports without controlled study',
  ],
  'Apenas teórica': [
    'Theoretical association unsupported by mechanistic or epidemiologic evidence so far',
    'Speculative connection raised in commentary papers but never tested rigorously',
  ],
  'Apenas histórica': [
    'Of historical interest only, replaced decades ago by evidence-based standards of care',
    'Legacy paradigm long abandoned after randomized trials demonstrated harm or futility',
  ],
  'Apenas histórico': [
    'Historical curiosity with no current role in evidence-based clinical practice',
    'Outdated approach now considered substandard outside resource-limited settings',
  ],
  'Sem qualquer aprovação': [
    'Investigational only, with no current FDA, EMA or international regulatory approval',
    'Pre-clinical compound that has not yet entered first-in-human trials',
    'Withdrawn from development after pivotal trial efficacy or safety failure',
  ],
  'Sem qualquer aplicação': [
    'No demonstrated clinical application in current evidence-based guidelines',
    'Lacks any established indication in modern clinical decision pathways',
  ],
  'Sem qualquer benefit': [
    'No measurable benefit observed in pivotal randomized clinical trials',
    'Failed to outperform placebo on primary or secondary endpoints in confirmatory studies',
  ],
  'Sem qualquer concern': [
    'Considered to carry no clinically significant safety concern across reported cohorts',
    'Reported safety profile entirely benign with no signal in pharmacovigilance databases',
  ],
  'Sem qualquer impacto': [
    'No measurable impact on hard endpoints in well-powered prospective studies',
    'Effect size indistinguishable from placebo in randomized comparisons',
  ],
  'Sem qualquer issue': [
    'Considered free of safety or efficacy concerns based on long-term registry data',
    'Reported neutral risk-benefit profile without notable clinical caveats',
  ],
  'Sem qualquer drug pipeline': [
    'No active drug development pipeline targeting this pathway in late-stage trials',
    'Pharmaceutical pipeline has been dormant for over a decade in this disease area',
  ],
  'Sem qualquer effect signal': [
    'No early efficacy signal detected in Phase 1 or open-label observational data',
    'Pharmacodynamic readouts indistinguishable from placebo in early-phase work',
  ],
  'Sem qualquer signal benefit': [
    'No early benefit signal detected in retrospective cohort or pilot trial data',
    'Observational and pilot signals fail to point to any clinical advantage',
  ],
  'Sem qualquer release': [
    'No release campaign undertaken pending additional regulatory and community review',
    'Held in pre-release status while community engagement and regulatory review continue',
  ],
  'Sem qualquer accuracy': [
    'Accuracy too low to support any clinical or screening application',
    'Sensitivity and specificity below thresholds required for medical-grade deployment',
  ],
  'Sem qualquer diferença': [
    'No meaningful difference detected between strategies on the primary composite endpoint',
    'Study showed numerical parity with overlapping confidence intervals across all arms',
  ],
  'Sem qualquer challenge': [
    'No remaining manufacturing, durability, or access challenge in current platforms',
    'Modern delivery platforms have resolved the major translational barriers entirely',
  ],
  'Sem qualquer disease-modifying': [
    'No disease-modifying agent has shown a positive Phase 3 readout in this indication',
    'Pipeline contains only symptomatic agents with no biology-changing candidate yet',
  ],
  'Sem qualquer caso humano': [
    'No first-in-human cases performed under any compassionate-use or IND framework',
    'Current evidence is limited to non-human primate work without any human exposure',
  ],
  'Sem qualquer convergência': [
    'No convergence pattern is recognizable across the modalities discussed',
    'The platforms remain entirely siloed without any shared translational themes',
  ],
  'Sem effect cardiovascular significant': [
    'No statistically significant cardiovascular signal in pre-specified outcome analyses',
    'Trial reported neutral cardiovascular results without efficacy on MACE components',
  ],
  'Sem effect CV': [
    'No cardiovascular benefit detected on the pre-specified primary outcome',
    'CVOT data reported neutral results across MACE and heart-failure endpoints',
  ],
  'Sem qualquer evidence': [
    'No supporting evidence in either randomized or large observational datasets',
    'Available evidence base is too sparse to support any clinical recommendation',
  ],
  'Apenas em pediatric': [
    'Indication strictly limited to pediatric populations under specialty supervision',
    'Approved label confined to children below adolescence, excluding adult use',
  ],
  'Apenas em US': [
    'Approved exclusively in the United States with no EMA or international pathway',
    'Limited US-only indication with no current submission to other regulatory agencies',
  ],
  'Apenas pesquisa pré-clínica sem aprovação': [
    'Pre-clinical research stage only, with no first-in-human trial yet initiated',
    'Confined to animal model studies pending IND-enabling toxicology work',
  ],
  'Apenas em rodentes': [
    'Demonstrated only in rodent disease models without primate or human translation',
    'Restricted to murine genetic models with no demonstrated cross-species replication',
  ],
  'Banimento global cattle editing': [
    'Global moratorium prohibits any genetic modification of cattle for food production',
    'International convention bans all heritable cattle editing pending broader consensus',
  ],
  'Banimento all sports': [
    'Recommends complete cessation of contact sport participation across all age groups',
    'Public health policy banning organized contact sports until adolescence',
  ],
  'Banimento all statin': [
    'Recommends complete withdrawal of statins from primary prevention populations',
    'Class-wide statin discontinuation regardless of risk factor status',
  ],
  'Banimento all thrombectomy': [
    'Recommends against any thrombectomy intervention regardless of imaging mismatch',
    'Procedural moratorium on mechanical thrombectomy outside research protocols',
  ],
  'Banimento total compounding permanente': [
    'Permanent prohibition of all 503A and 503B compounding pathways for these agents',
    'FDA-issued absolute ban on compounded versions independent of shortage status',
  ],
  'Banimento contraceptivos': [
    'Strict avoidance of all hormonal contraceptive co-administration based on this concern',
    'Categorical contraindication for any concurrent contraceptive use',
  ],
  'Banimento GLP-1 por sarcopenia': [
    'Class-wide GLP-1 withdrawal driven by lean-mass loss and frailty endpoints',
    'Regulatory action restricting GLP-1 use because of sarcopenia outcomes data',
  ],
  'Aprovação FDA AUD já confirmada': [
    'FDA approval for alcohol use disorder is already on label following Phase 3 data',
    'Already carries an established AUD indication backed by pivotal randomized trials',
  ],
  'Aprovação universal germline': [
    'International regulators have endorsed clinical germline editing for medical use',
    'Universal regulatory pathway exists for heritable germline modification protocols',
  ],
  'Aprovação universal medical-grade': [
    'Carries universal medical-grade approval equivalent to ECG patches or Holter monitors',
    'Has the same level of regulatory clearance as a hospital diagnostic device',
  ],
  'Aprovação rotineira clinical': [
    'Routine clinical approval is established across multiple regulatory agencies',
    'Holds standard-of-care regulatory status comparable to allotransplant',
  ],
  'Aprovação banida': [
    'Regulatory approval has been withdrawn following adverse post-market findings',
    'Authorization formally revoked after confirmatory trials failed to replicate benefit',
  ],
  'Aprovação 100% genéricos imediata': [
    'Immediate authorization of all generic copies regardless of branded exclusivity',
    'Blanket FDA generic approval bypassing standard ANDA bioequivalence pathway',
  ],
  'Aprovação para uso humano farmacêutico': [
    'Granted full pharmaceutical use approval for human therapy in this indication',
    'Approved as a human therapeutic agent rather than for agricultural application',
  ],
  'Mesmo bleeding risk de warfarin': [
    'Equivalent bleeding profile to warfarin without any reduction in major hemorrhage',
    'Carries the same intracranial hemorrhage risk as vitamin K antagonist therapy',
  ],
  'Mais complications que RF': [
    'Higher periprocedural complication rate than radiofrequency or cryoballoon ablation',
    'Greater incidence of phrenic nerve and esophageal injury than thermal ablation',
  ],
  'Aumento eventos paradoxal': [
    'Paradoxical increase in adverse cardiovascular events versus placebo arm',
    'Treatment-arm event rate exceeded the placebo arm in pre-specified analyses',
  ],
  'Aumento de peso paradoxal vs placebo': [
    'Paradoxical weight gain compared with placebo across the trial population',
    'Mean body weight increased over 68 weeks versus placebo despite mechanism',
  ],
  'Aumentou eventos cardiovasculares paradoxalmente': [
    'Paradoxical increase in MACE versus placebo across the SELECT cohort',
    'Reported a paradoxical excess of cardiovascular events versus standard therapy',
  ],
  'Aumento eventos respiratórios': [
    'Increased frequency of respiratory adverse events compared with placebo arm',
    'Worsened apnea-hypopnea metrics in the active arm relative to control',
  ],
  'Aumento HF events': [
    'Increased heart failure hospitalization signal in active versus comparator arm',
    'Worsened HF events on background guideline-directed medical therapy',
  ],
  'Aumento consumo álcool paradoxal': [
    'Paradoxical increase in alcohol consumption observed in active-arm participants',
    'Mean weekly alcohol intake rose in the treatment cohort relative to control',
  ],
  'Sem ação regulatory': [
    'No regulatory action taken by FDA or international agencies in response to demand',
    'Regulators issued no guidance or shortage-mitigation measures during this period',
  ],
  'Não teve effect cardiovascular significant': [
    'Did not produce a statistically significant cardiovascular outcome difference',
    'Reported neutral effects on the pre-specified MACE composite endpoint',
  ],
  'Daily oral pill': [
    'Once-daily oral tablet given without loading or maintenance interval adjustments',
    'Self-administered oral capsule taken consistently every morning at home',
  ],
  'IV daily infusion': [
    'Daily IV infusion administered in a hospital outpatient infusion suite',
    'Continuous-infusion regimen requiring inpatient monitoring throughout treatment',
  ],
  'SC daily injection': [
    'Daily subcutaneous injection self-administered with adherence supervision',
    'Once-daily SC dosing program comparable to long-term insulin schedules',
  ],
  'Apenas pulsatile flow': [
    'Older pulsatile pump architecture similar to first-generation HeartMate I devices',
    'Pneumatic pulsatile design predating modern continuous-flow LVAD technology',
  ],
  'Apenas curativo bridge sem destination': [
    'Bridge-to-transplant indication only, without destination-therapy authorization',
    'Restricted to candidates awaiting transplant rather than long-term support',
  ],
  'Idêntico HeartMate 2': [
    'Mechanically identical to the HeartMate II axial-flow pump without redesign',
    'Carries the same shear-related thrombosis profile as second-generation devices',
  ],
  'Mesmo factor VIII concentrate convencional': [
    'Conventional plasma-derived factor VIII concentrate without any genetic component',
    'Standard recombinant FVIII infusion identical to legacy prophylactic protocols',
  ],
  'Apenas factor VIII concentrate convencional': [
    'Conventional plasma-derived factor VIII concentrate without any genetic component',
    'Standard recombinant FVIII infusion identical to legacy prophylactic protocols',
  ],
  'Anti-VEGF therapy': [
    'Intravitreal anti-VEGF agent borrowed from neovascular retinal disease management',
    'Anti-angiogenic therapy targeting VEGF rather than coagulation factor expression',
  ],
  'Allogeneic transplant': [
    'Allogeneic stem-cell transplant from an HLA-matched related donor without editing',
    'Standard allogeneic HSCT protocol with calcineurin-based GVHD prophylaxis',
  ],
  'Apenas immunosuppressant': [
    'Broad immunosuppressant regimen without bispecific or factor-mimetic activity',
    'Generic systemic immunosuppression rather than coagulation-targeted bridging',
  ],
  'Anti-tissue factor antibody': [
    'Anti-tissue factor antibody approach blocking initiation of the extrinsic pathway',
    'TFPI inhibitor concept (concizumab/marstacimab) acting via different mechanism',
  ],
  'Recombinant FVIII com extended half-life padrão': [
    'Recombinant FVIII Fc-fusion with extended half-life given by repeated IV dosing',
    'PEGylated FVIII with extended pharmacokinetics requiring IV prophylaxis',
  ],
  'CRISPR direta in vivo': [
    'In vivo CRISPR/Cas9 delivered systemically to bone marrow without ex vivo manipulation',
    'Direct in vivo gene-editing infusion bypassing autologous cell collection entirely',
  ],
  'Allogeneic transplant from random donor sem editing': [
    'Standard allogeneic HSCT from a random unrelated donor without gene editing',
    'Conventional matched-unrelated-donor transplant avoiding any genetic modification',
  ],
  'Small molecule oral': [
    'Oral small-molecule HbF inducer comparable to legacy hydroxyurea regimens',
    'Once-daily oral disease modifier without any cell or vector component',
  ],
  'Autosomal dominantes acometendo igualmente sexos': [
    'Autosomal dominant disorders affecting both sexes equally with consistent penetrance',
    'Mendelian dominant disorders with male and female prevalence essentially equal',
  ],
  'Acquired apenas em adultos sem componente genético': [
    'Acquired anti-FVIII autoantibody disorder confined to adults without germline mutation',
    'Late-onset acquired hemophilia driven by autoimmunity, no inherited component',
  ],
  'Apenas mulheres carriers sem manifestação': [
    'Female-only X-linked carrier syndrome with universally asymptomatic phenotype',
    'Sex-limited carrier expression that never manifests with bleeding events',
  ],
  'Daily oral pill barato': [
    'Once-daily inexpensive oral tablet covered by most insurance formularies',
    'Cheap generic oral therapy with no specialty pharmacy or REMS requirements',
  ],
  'Allogeneic stem cell transplant': [
    'Allogeneic stem-cell transplant after myeloablative conditioning from a matched donor',
    'Standard allo-HSCT pathway used for hematologic malignancies adapted to hemophilia',
  ],
  'Apenas terapia experimental sem aprovação': [
    'Experimental investigational therapy without any current regulatory authorization',
    'Compassionate-use protocol limited to a handful of academic centers',
  ],
  'Apenas trombocitopenia benigna sem trombose': [
    'Mild benign type-I non-immune thrombocytopenia resolving without clinical thrombosis',
    'Transient drug-induced thrombocytopenia without immune or thrombotic complications',
  ],
  'Indicação para mais heparin': [
    'Clinical signal that escalating heparin dose is required to overcome resistance',
    'Suggests need for higher therapeutic UFH targets under aPTT monitoring',
  ],
  'Sem clinical relevance': [
    'Laboratory finding without clinical sequelae or actionable management change',
    'Incidental result not associated with bleeding or thrombotic outcomes in cohort data',
  ],
  'Apenas platelet transfusions sem outras therapies': [
    'Routine prophylactic platelet transfusions as the sole chronic management strategy',
    'Standing weekly transfusions with no immunomodulatory or thrombopoietic therapy',
  ],
  'Sem treatment, observation only sempre': [
    'Pure observation pathway with no pharmacologic intervention regardless of severity',
    'Watchful-waiting strategy that defers all therapy until life-threatening hemorrhage',
  ],
  'Anti-coagulation indicada': [
    'Empirical anticoagulation directed at presumed prothrombotic state from antibodies',
    'Routine prophylactic anticoagulation as cornerstone of management',
  ],
  'Plasmapheresis convencional só': [
    'Therapeutic plasma exchange targeting offending IgM cold agglutinin as monotherapy',
    'Conventional plasmapheresis program without any complement-pathway modulator',
  ],
  'Steroid simples': [
    'High-dose corticosteroid monotherapy as first-line FDA-labeled treatment',
    'Generic prednisone regimen relied on as the established standard of care',
  ],
  'Anti-CD20 mAb': [
    'Anti-CD20 rituximab as the only FDA-labeled CAD therapy via B-cell depletion',
    'Rituximab monotherapy approved for cold agglutinin disease via CD20 targeting',
  ],
  'Apenas IV mensal': [
    'Monthly IV anti-C5 antibody equivalent to eculizumab without alternative-pathway action',
    'IV-only regimen comparable to ravulizumab maintenance dosing every several weeks',
  ],
  'Imunossupressor inespecífico': [
    'Broad calcineurin-inhibitor immunosuppression directed at PIGA-mutant clone suppression',
    'Generic systemic immunosuppression without complement pathway specificity',
  ],
  'Anti-platelet': [
    'Anti-GPIIb/IIIa antiplatelet preventing intravascular thrombotic complications',
    'Antiplatelet therapy targeting the prothrombotic state of complement-mediated hemolysis',
  ],
  'Apenas observação watchful waiting': [
    'Watchful waiting with growth-factor support (G-CSF, EPO) only as primary therapy',
    'Pure observation strategy supported by transfusion bridging during count nadirs',
  ],
  'Quimioterapia citotóxica intensiva': [
    'Induction cytotoxic chemotherapy similar to AML protocols to reset marrow function',
    'High-dose cytarabine + anthracycline regimens repurposed from leukemia care',
  ],
  'Apenas transfusões cronicamente': [
    'Lifelong chronic transfusion support with iron chelation as definitive therapy',
    'Indefinite transfusion-dependent strategy without immunosuppression or HSCT attempt',
  ],
  'Não realizado em US': [
    'Available only via opt-in cord-blood testing in tertiary centers, not universal screening',
    'Implemented exclusively under selective public-health pilot programs',
  ],
  'Apenas em adultos': [
    'Reserved for adult preconception carrier screening rather than newborn identification',
    'Adult-only screening pathway aligned with reproductive counseling programs',
  ],
  'Apenas estados de high-prevalence': [
    'Limited to historically high-prevalence states under selective public-health programs',
    'Available only in states with sufficient population frequency to justify screening',
  ],
  'Sem alternativa para oral iron': [
    'Pharmacologically equivalent to oral ferrous sulfate with identical bioavailability',
    'Reserved only for cost reasons since oral therapy has comparable efficacy',
  ],
  'Apenas blood transfusion option': [
    'Indicated only after packed RBC transfusion has failed to correct hemoglobin',
    'Reserved as salvage therapy when transfusion has not normalized iron stores',
  ],
  'Sempre cause iron overload severo': [
    'Reliably triggers transfusional iron overload requiring deferasirox chelation',
    'Predictably causes hemochromatosis-like overload mandating chelation for nearly all',
  ],
  'Apenas effect lipid sem CV': [
    'Lipid-lowering only with no cardiovascular outcome benefit on hard endpoints',
    'Reduces LDL but failed to demonstrate MACE benefit in CVOT readouts',
  ],
  'Aumento eventos CV': [
    'Increased cardiovascular event rate observed in active-arm participants',
    'Trial-arm MACE excess relative to placebo despite favorable LDL changes',
  ],
  'Apenas em pediatric FH': [
    'Indication limited to pediatric heterozygous familial hypercholesterolemia only',
    'Pediatric-only HoFH/HeFH label without adult atherosclerotic cardiovascular use',
  ],
  'Apenas statins eficazes Lp(a)': [
    'Statins lower Lp(a) substantially, removing need for new targeted therapies',
    'Conventional lipid-lowering already addresses Lp(a) without dedicated agents',
  ],
  'Apenas vitamina niacin': [
    'Niacin monotherapy at high dose as the established Lp(a)-lowering strategy',
    'Vitamin B3 derivative niacin given for nicotinic acid receptor effects',
  ],
  'Apenas digoxin': [
    'Digoxin monotherapy as the cornerstone of HFrEF management',
    'Cardiac glycoside-based regimen relied on as sole disease-modifying therapy',
  ],
  'Apenas diuretics': [
    'Loop diuretic monotherapy as the foundation of long-term HFrEF management',
    'Furosemide-based volume management without neurohormonal modulation',
  ],
  'ACEi alone sem outras': [
    'ACE inhibitor monotherapy without beta-blocker, MRA, or SGLT2 inhibitor co-therapy',
    'Single-pillar ACEi-only regimen lacking modern 4-pillar combination',
  ],
  'TAVR inferior SAVR all populations': [
    'TAVR consistently inferior to SAVR for mortality and stroke across all risk strata',
    'Surgical AVR remains superior in low, intermediate, and high-risk populations',
  ],
  'Banimento TAVR all-risk': [
    'Regulatory withdrawal of all-risk TAVR indication after long-term durability concerns',
    'Restriction of TAVR back to inoperable patients only following safety review',
  ],
  'Apenas em high-risk inoperable': [
    'TAVR remains restricted to surgically inoperable severe aortic stenosis patients',
    'Indication unchanged from 2011 PARTNER 1B inoperable cohort label',
  ],
  'Apenas pacing': [
    'Conventional pacing function only without LAA closure capability',
    'Single-chamber bradycardia pacing device without thrombus-prevention design',
  ],
  'Substituem ICD': [
    'Replace implantable cardioverter-defibrillator function with anti-arrhythmic delivery',
    'Functional substitute for ICD with built-in defibrillation capability',
  ],
  'Apenas para HF': [
    'Indication restricted to heart failure populations rather than AFib stroke prevention',
    'Approved only for HFrEF symptomatic relief with no AFib indication',
  ],
  'Apenas aortic valve': [
    'Approved exclusively for transcatheter aortic valve replacement, not mitral repair',
    'Limited to aortic stenosis indication without mitral or tricuspid extension',
  ],
  'Cirurgia única opção': [
    'Open surgical repair remains the sole intervention without transcatheter alternative',
    'Conventional cardiac surgery is the only available pathway for severe regurgitation',
  ],
  'Apenas chelator iron': [
    'Iron-chelator class molecule similar to deferasirox without TTR stabilization',
    'Pure iron-chelating activity targeting overload rather than amyloid biology',
  ],
  'Anti-inflammatory generic': [
    'Generic anti-inflammatory agent without amyloidogenesis-modifying activity',
    'Broad NSAID-class compound lacking transthyretin tetramer stabilization',
  ],
  'Substituto cardiac transplant': [
    'Direct substitute for orthotopic cardiac transplantation in advanced amyloidosis',
    'Therapeutic alternative to heart transplant for end-stage cardiac amyloid',
  ],
  'LBBAP universal contraindicada': [
    'LBBAP universally contraindicated due to lead-perforation and capture-loss risk',
    'Conduction-system pacing prohibited regardless of LBBB or LVEF status',
  ],
  'Substituiu cirurgia cardíaca aberta': [
    'Has replaced all open cardiac surgery for valve and structural disease',
    'Now serves as universal substitute for surgical bypass and valve replacement',
  ],
  'Apenas em pediatric severe obesity': [
    'Approved exclusively for pediatric severe obesity rather than adult populations',
    'Indication confined to children with class III obesity below age 12',
  ],
  'Apenas peso temporário sem efeito clínico': [
    'Produces only transient weight reduction without measurable clinical outcome benefit',
    'Short-term weight effects without impact on cardiovascular or metabolic endpoints',
  ],
  'Apenas T1D': [
    'Indication strictly limited to type 1 diabetes without type 2 or obesity use',
    'Type 1 diabetes-only label excluding any T2D or weight-management application',
  ],
  'Cura T1D estabelecido': [
    'Curative therapy reversing established type 1 diabetes back to insulin independence',
    'Indication includes full reversal of long-standing T1D rather than delay',
  ],
  'Apenas profilaxia primária population-wide': [
    'Population-wide primary prevention without autoantibody or stage screening',
    'Mass administration to general pediatric population independent of T1D risk',
  ],
  'Substituto insulina established T1D': [
    'Direct substitute for insulin therapy in patients with established type 1 diabetes',
    'Replaces basal-bolus insulin in long-standing T1D without islet replacement',
  ],
  'Autologous transplant sem cells diferenciadas': [
    'Autologous bone marrow transplant without differentiated islet-cell component',
    'Self-cell HSCT pathway lacking any beta-cell or stem-cell-derived islet element',
  ],
  'Vaccine prophylactic': [
    'Prophylactic vaccine targeting islet autoantigens to prevent T1D onset',
    'Active immunization approach rather than cell-replacement therapy',
  ],
  'Apenas pumps simples sem CGM integration': [
    'Standalone insulin pump without continuous glucose monitor algorithmic integration',
    'Open-loop pump therapy lacking CGM-driven automated dose adjustments',
  ],
  'Sem qualquer sistema closed loop': [
    'No commercially available closed-loop automated insulin delivery system to date',
    'Closed-loop technology remains unavailable outside research protocols',
  ],
  'Apenas sistemas DIY illegal': [
    'Only DIY OpenAPS/Loop community systems available, with no commercial approval',
    'Restricted to off-label DIY hybrid closed-loop builds without FDA pathway',
  ],
  'Apenas T1D pediatric': [
    'Indication limited to pediatric type 1 diabetes outside adult populations',
    'Pediatric T1D-only label without adult or non-insulin-using authorization',
  ],
  'Apenas hospital use': [
    'Approved exclusively for inpatient hospital glucose monitoring without home use',
    'Restricted to ICU and inpatient settings under direct clinical supervision',
  ],
  'Apenas pesquisa banned para uso clinical': [
    'Research-only deployment with explicit prohibition on clinical decision-making use',
    'Investigational use only, prohibited for direct clinical management decisions',
  ],
  'Cirrhosis decompensada': [
    'Indication for decompensated cirrhosis including ascites and hepatic encephalopathy',
    'Approved use covers Child-Pugh C decompensated cirrhosis populations',
  ],
  'Apenas obesidade sem MASH': [
    'Approved for obesity management without specific MASH histological criteria',
    'Weight-loss-only indication independent of liver fibrosis stage',
  ],
  'Apenas paliativo sem effect doença': [
    'Strictly palliative role with no disease-modifying impact on tumor biology',
    'Symptom-focused palliative therapy without effect on tumor progression',
  ],
  'Cura completa thyroid cancer': [
    'Curative regimen producing complete pathologic response in differentiated thyroid cancer',
    'Definitive cure replacing surgery and radioactive iodine in DTC management',
  ],
  'Apenas observação sem qualquer workup': [
    'Pure observation strategy without biochemical or imaging workup beyond initial CT',
    'Watchful waiting without dexamethasone suppression or metanephrine screening',
  ],
  'Cirurgia universal de todas': [
    'Universal adrenalectomy for every adrenal incidentaloma regardless of imaging features',
    'Surgical resection recommended for all adrenal masses irrespective of size or function',
  ],
  'Apenas adultos sem comorbidades': [
    'Workup recommended only for adults without comorbidities or hypertension',
    'Restricted to healthy adult populations without metabolic or cardiac history',
  ],
  '<0.01% raríssimo': [
    'Extremely rare cause of hypertension at well below 0.01% population prevalence',
    'Vanishingly uncommon endocrine etiology contributing to <0.01% of HTN cases',
  ],
  '100% hypertensive': [
    'Identified as the underlying cause in essentially every hypertensive patient',
    'Universal mechanism behind all forms of essential and secondary hypertension',
  ],
  'Apenas vitamina D': [
    'Vitamin D supplementation alone as the established disease-modifying therapy',
    'Cholecalciferol supplementation relied on as the standard pharmacotherapy',
  ],
  'Apenas exercício sem drug': [
    'Lifestyle and exercise-only approach without pharmacologic intervention',
    'Non-pharmacologic resistance training program without anti-resorptive medication',
  ],
  'Hormone replacement therapy': [
    'Conventional menopausal hormone replacement therapy as primary treatment',
    'Estrogen-progestin replacement regimen used as the cornerstone of management',
  ],
  'Cirurgia universal ovariana': [
    'Universal bilateral oophorectomy as first-line management for all PCOS patients',
    'Surgical ovarian wedge resection or drilling recommended for all phenotypes',
  ],
  'Apenas observação': [
    'Observation-only strategy without lifestyle, contraceptive, or metformin trial',
    'Watchful-waiting protocol with no targeted hormonal or metabolic intervention',
  ],
  'Wait 24 horas observation': [
    '24-hour observation window before any antibiotic or fluid resuscitation begins',
    'Delayed assessment over 24h before initiating sepsis bundle elements',
  ],
  'Apenas oral medications': [
    'Oral antibiotic therapy alone without IV access or fluid resuscitation',
    'Outpatient oral regimen substituted for inpatient IV bundle elements',
  ],
  'Sem fluid resuscitation': [
    'Sepsis management protocol that omits any crystalloid fluid resuscitation',
    'Strategy avoiding all IV fluids despite hypoperfusion or elevated lactate',
  ],
  'Apenas cosmetic surgery': [
    'Cosmetic-only surgical applications without any structural or valve indication',
    'Aesthetic plastic surgery procedures rather than structural cardiac repair',
  ],
  'Apenas pediatric heart surgery': [
    'Pediatric congenital heart surgery applications without adult valve indication',
    'Limited to pediatric cardiac repair rather than adult structural disease',
  ],
  'Banimento cirurgia aberta': [
    'Recommends discontinuation of all open cardiac surgery in favor of percutaneous',
    'Mandates universal transcatheter approach prohibiting any open chest surgery',
  ],
  'Apenas placebo': [
    'Functions as a sugar-pill placebo without any active pharmacologic mechanism',
    'Inert comparator-arm formulation without therapeutic intent',
  ],
  'Antibiotic genérico': [
    'Generic broad-spectrum antibiotic without pharmacologic relevance to neuromuscular blockade',
    'Standard antimicrobial therapy unrelated to anesthesia reversal',
  ],
  'Substituto succinylcholine': [
    'Direct substitute for succinylcholine providing rapid-sequence neuromuscular blockade',
    'Replacement for the depolarizing relaxant rather than reversal of non-depolarizing agents',
  ],
  'Apenas <3h tPA': [
    'Reserved exclusively for tPA administration within the 3-hour ischemic stroke window',
    'Limited to early-window pharmacologic thrombolysis without mechanical thrombectomy',
  ],
  'Apenas pediatric': [
    'Indication limited to pediatric stroke populations under specialty supervision',
    'Pediatric-only authorization without adult acute ischemic stroke approval',
  ],
  'Apenas vitiligo': [
    'Approved indication restricted to vitiligo without atopic dermatitis or asthma use',
    'Vitiligo-only label without expansion to type 2 inflammation conditions',
  ],
  'Apenas psoriasis': [
    'Approved exclusively for plaque psoriasis without atopic dermatitis or asthma indications',
    'Psoriasis-only label without crossover to type 2 inflammation diseases',
  ],
  'Sem qualquer indicação dermatologic': [
    'Carries no current dermatologic indication on its FDA or EMA label',
    'Dermatology indications absent from current regulatory authorizations',
  ],
  'Insulin replacement basal-bolus tradicional': [
    'Conventional basal-bolus insulin replacement regimen without disease modification',
    'Standard MDI insulin therapy targeting symptomatic glycemic control only',
  ],
  'Metformin': [
    'Generic metformin biguanide therapy traditionally used in type 2 diabetes',
    'Standard biguanide first-line oral hypoglycemic without immune modulation',
  ],
  'Apenas beta-blocker': [
    'Generic beta-blocker monotherapy without targeted myosin-inhibition mechanism',
    'Conventional beta-adrenergic blockade as the sole pharmacologic strategy',
  ],
  'Apenas surgical septal myectomy': [
    'Surgical septal myectomy as the only available LVOT obstruction intervention',
    'Open surgical septal reduction therapy without pharmacologic alternative',
  ],
  'Sem qualquer drug specific': [
    'No HCM-specific drug class available, leaving generic agents as standard care',
    'Therapeutic landscape limited to legacy beta-blockers without targeted options',
  ],
  'Apenas slow incremental progress': [
    'Slow incremental advances without convergence across modalities',
    'Linear stepwise progress dominated by single-platform refinements',
  ],
  'Apenas regression para anos 1990s': [
    'Regression toward 1990s pharmacology without modern platform innovation',
    'Reversion to pre-genomic medicine paradigms across the major therapeutic areas',
  ],
  'Apenas regression para 1990s standard': [
    'Reversion to 1990s standards of care without modern platform integration',
    'Loss of post-2000 platform innovations across therapeutic areas',
  ],
  'Sem mais avanço esperado': [
    'No further therapeutic advance anticipated across these biomedical frontiers',
    'Clinical pipelines forecast as essentially flat over the coming decade',
  ],
  'Apenas surgery clássica': [
    'Conventional surgery as the sole pathway across all of these therapeutic areas',
    'Open surgical approach maintained without minimally invasive or pharmacologic shift',
  ],
  'Apenas trivial': [
    'Trivial physiologic concern without clinical or population-health relevance',
    'Minor incidental finding without epidemiologic or therapeutic implications',
  ],
  'Apenas estética': [
    'Cosmetic-only application without functional or quality-of-life endpoint',
    'Aesthetic improvement only without measurable disease-modifying effect',
  ],
  'Cataract surgery': [
    'Cataract extraction and intraocular lens placement repurposed for retinal disease',
    'Phacoemulsification approach used outside its standard cataract indication',
  ],
  'Apenas LASIK': [
    'Refractive LASIK surgery applied outside its standard refractive correction indication',
    'Excimer-laser corneal reshaping approach unrelated to retinal gene therapy',
  ],
  'Probiotic OTC genérico': [
    'Generic over-the-counter probiotic supplement without strain-specific evidence',
    'Yogurt-derived live cultures sold as nutritional supplements without disease label',
  ],
  'Trasplant fecal único método': [
    'Conventional fecal microbiota transplant via colonoscopy as the only delivery option',
    'Donor stool FMT delivery limited to nasoenteric or colonoscopic administration',
  ],
  'Apenas IV antibiotic': [
    'IV-only antibiotic regimen without microbiome-restoration component',
    'Continued vancomycin or fidaxomicin antibiotics without ecology restoration',
  ],
  'Apenas private sector self-regulation': [
    'Industry self-regulation pathway without federal or international oversight',
    'Privately governed code of conduct without statutory enforcement authority',
  ],
  'Sem qualquer oversight': [
    'No regulatory oversight by NIH, HHS, or international biosafety bodies',
    'Operates entirely outside DURC, P3CO, or institutional review frameworks',
  ],
  'Apenas nuclear policy': [
    'Nuclear non-proliferation framework rather than biological dual-use governance',
    'Atomic energy oversight model misapplied to gene-synthesis screening',
  ],
  'Apenas histórica China sanção': [
    'Limited to a Chinese domestic legal sanction without global governance response',
    'National-level sentencing only, with no parallel international governance action',
  ],
  'Apenas China sanção': [
    'Limited to a Chinese domestic legal sanction without global governance response',
    'National-level sentencing only, with no parallel international governance action',
  ],
  'Apenas vegetais': [
    'Limited to plant biotechnology applications without animal agriculture relevance',
    'Restricted to genetically modified crops, excluding livestock interventions',
  ],
  'Banimento all': [
    'Categorical ban on all genetically modified organisms in food production',
    'Universal prohibition covering plant, animal, and microbial GE applications',
  ],
  'Apenas oncology agent': [
    'Oncology indication only without any role in benign hematology or SCD biology',
    'Anti-cancer cytotoxic agent without disease-modifying effect on hemoglobinopathies',
  ],
  'Apenas effect glycemic sem CV': [
    'Glycemic-effect only without measurable cardiovascular outcome benefit',
    'A1c reduction only with neutral CVOT readouts on heart failure and renal endpoints',
  ],
  'Insulin replacement basal-bolus': [
    'Standard basal-bolus insulin replacement regimen without disease modification',
    'Conventional MDI insulin therapy targeting glycemic control only',
  ],
  'Apenas insulin replacement': [
    'Standard basal-bolus insulin replacement regimen without disease modification',
    'Conventional MDI insulin therapy targeting glycemic control only',
  ],
  'Apenas SGLT2 inhibition': [
    'SGLT2 inhibitor monotherapy without GIP or GLP-1 receptor activity',
    'Sodium-glucose cotransporter inhibition only, without incretin effect',
  ],
  'Apenas DPP-4 inhibition': [
    'DPP-4 inhibitor class effect without direct GIP or GLP-1 receptor agonism',
    'Gliptin-class enzyme inhibition raising endogenous incretins indirectly',
  ],
  'Sem qualquer evolução': [
    'No notable evolution beyond the original first-generation device or protocol',
    'Field has stagnated for over a decade with no meaningful design or efficacy advance',
    'Subsequent iterations failed to demonstrate clinical advantage over the legacy approach',
  ],
  'Sem qualquer estrutura': [
    'No formalized care-pathway structure or systems-of-care designation in place',
    'Operates without recognized regulatory or accreditation framework',
    'Lacks any institutional or society-endorsed organizational template',
  ],
  'Apenas em UK': [
    'Approved exclusively in the United Kingdom under MHRA without other regulatory pathways',
    'NICE-only authorization without parallel FDA or EMA submissions',
    'Limited to UK NHS deployment without international rollout',
  ],
  'Sem qualquer benefício': [
    'No measurable benefit on primary or secondary endpoints in confirmatory studies',
    'Trial failed to outperform placebo across pre-specified outcome analyses',
    'Effect size was not clinically meaningful in well-powered comparisons',
  ],
  'Sem qualquer mudança': [
    'No meaningful practice change recommended after the trial readouts',
    'Existing standards of care remain unchanged following these results',
    'Did not lead to any guideline modification or workflow update',
  ],
  'Sem qualquer trial': [
    'No randomized clinical trial has yet been conducted in this indication',
    'Pivotal trial program has never been initiated for this disease area',
  ],
  'Sem qualquer treatment': [
    'No FDA-approved or guideline-endorsed treatment exists for this condition',
    'Therapeutic landscape remains entirely off-label without standard-of-care options',
  ],
  'Sem qualquer relação': [
    'No demonstrated clinical or mechanistic relationship between these factors',
    'Association is unsupported by epidemiologic or mechanistic evidence',
  ],
  'Sem qualquer recommendation': [
    'No society or guideline recommendation issued in support of this practice',
    'Major guidelines (AHA, ACC, ESC, ASH, ASCO) take no position on this approach',
  ],
  'Sem qualquer prevention': [
    'No primary or secondary prevention benefit demonstrated in randomized data',
    'Prevention strategies in this domain rest on lifestyle measures alone',
  ],
  'Sem qualquer mecanismo': [
    'No proposed mechanism connects this intervention to the disease biology',
    'Mechanistic basis remains undefined despite multiple investigative attempts',
  ],
  'Sem qualquer estratégia': [
    'No recognized therapeutic strategy beyond symptom management',
    'Lacks an established disease-modifying strategy in current practice',
  ],
  'Sem qualquer função': [
    'No demonstrated physiologic function in mammalian biology',
    'Apparent vestigial role without measurable downstream effect',
  ],
  'Sem qualquer debate': [
    'No ongoing scientific or ethical debate within the relevant research community',
    'Scientific consensus has been settled without remaining controversy',
  ],
  'Sem qualquer regulamentação': [
    'Operates outside any specific regulatory framework or oversight body',
    'No targeted regulation has been issued by FDA, EMA, or international agencies',
  ],
  'Sem qualquer regulação': [
    'No targeted regulation in place to govern this technology or practice',
    'Regulators have explicitly declined to issue guidance in this area',
  ],
  'Sem qualquer screening': [
    'No screening pathway recommended by USPSTF or specialty societies',
    'Population screening remains unavailable outside research protocols',
  ],
  'Sem qualquer protocolo': [
    'No standardized protocol exists for clinical implementation in routine care',
    'Practice patterns vary widely without consensus operational protocol',
  ],
  'Sem qualquer evidência': [
    'No supporting evidence base in either randomized trials or large observational studies',
    'Available evidence is too limited to recommend clinical adoption',
  ],
  'Sem qualquer base': [
    'No mechanistic or clinical evidence base supports this hypothesis',
    'Lacks foundational data needed to justify further investigation',
  ],
  'Sem qualquer descoberta': [
    'No discovery in this Nobel-recognized area of mechanistic biology',
    'No advance reported on the biochemical or molecular pathway in question',
  ],
  'Sem qualquer policy resposta': [
    'No coordinated policy response from international or national governance bodies',
    'Regulatory and legislative bodies took no formal action despite public attention',
  ],
  'Apenas opioid': [
    'Opioid analgesic monotherapy without non-opioid mechanistic alternative',
    'Standard mu-receptor agonist analgesia without modern multimodal options',
  ],
  'Apenas voluntário': [
    'Purely voluntary registry without enforced participation or oversight',
    'Volunteer-driven cohort participation without regulatory mandate',
  ],
  'Apenas voluntary': [
    'Purely voluntary registry without enforced participation or oversight',
    'Volunteer-driven cohort participation without regulatory mandate',
  ],
  'Apenas surgery': [
    'Surgical intervention as the sole pathway without pharmacologic alternative',
    'Open surgical management without minimally invasive or medical option',
  ],
  'Apenas Rx': [
    'Prescription-only pharmacotherapy without any over-the-counter or device option',
    'Restricted to physician-prescribed medication outside lifestyle interventions',
  ],
  'Apenas custos': [
    'Health-economic concerns dominate without clinical safety or efficacy implications',
    'Cost considerations alone drive the recommendation without outcome data',
  ],
  'Apenas custo': [
    'Cost is the only consideration without clinical efficacy or safety implications',
    'Health-economic argument alone, independent of biological mechanism',
  ],
  'Apenas adult': [
    'Adult-only authorization without any pediatric or adolescent indication',
    'Approved label restricted to adults without crossover use in younger populations',
  ],
  'Apenas pesquisa básica': [
    'Basic-science research only, without translational or clinical application yet',
    'Confined to bench investigations without preclinical or human trial development',
  ],
  'Apenas IV': [
    'IV-only administration in hospital infusion settings without alternative routes',
    'Restricted to in-clinic intravenous delivery without subcutaneous or oral options',
  ],
  'Apenas SC': [
    'Subcutaneous-only injection without IV or oral formulation',
    'Self-administered SC injection as the sole delivery option available',
  ],
  'Apenas hospital': [
    'Hospital-only setting without ambulatory or home-administration option',
    'Restricted to inpatient deployment under direct clinical supervision',
  ],
  'Apenas trauma': [
    'Trauma-setting application only, without expansion to non-traumatic indications',
    'Limited to trauma resuscitation without elective or chronic-care relevance',
  ],
  'Apenas surgical': [
    'Surgical-only application without pharmacologic or device-based alternative',
    'Open surgical pathway as the exclusive treatment route',
  ],
  'Apenas dopamine': [
    'Dopaminergic-only mechanism without serotonergic or noradrenergic component',
    'Targets dopamine pathway alone without modulation of other neurotransmitters',
  ],
  'Apenas CPAP': [
    'Continuous positive airway pressure as the sole therapeutic option',
    'Mechanical CPAP only without pharmacologic or surgical alternatives',
  ],
  'Apenas paliativo, nunca curativo': [
    'Palliative-only role with no proven curative impact regardless of stage',
    'Symptom-focused palliation without any disease-modifying potential',
  ],
  'Apenas paliativo sem effect doença': [
    'Strictly palliative role with no measurable impact on disease progression',
    'Symptom relief only without effect on tumor or disease biology',
  ],
  'Apenas factor VIII concentrate': [
    'Conventional plasma-derived factor VIII concentrate without genetic component',
    'Standard recombinant FVIII infusion without any vector or editing strategy',
  ],
  'Substituto beta-blocker': [
    'Direct substitute for beta-blocker therapy in HCM management',
    'Replaces beta-adrenergic blockade rather than acting on myosin biology',
  ],
  'Substituto sildenafil': [
    'Direct substitute for PDE5 inhibitor sildenafil in PAH management',
    'Replaces PDE5 inhibitor therapy rather than activin signaling modulation',
  ],
  'Substitui injectable sem absorption': [
    'Substitutes injectable peptides without addressing oral absorption barriers',
    'Replaces SC injection without solving the gastric peptide degradation problem',
  ],
  'Aumento de peso paradoxal': [
    'Paradoxical weight gain observed in active-treatment versus comparator arm',
    'Mean body weight increased in active arm despite mechanistic expectation',
  ],
  'Aumento HbS': [
    'Stimulates erythropoiesis with increased total HbS production',
    'Drives HbS-rich erythrocyte output without HbF compensatory induction',
  ],
  'Aumento': [
    'Paradoxical increase observed in the active-treatment cohort',
    'Mean values rose in the active arm relative to placebo control',
  ],
  'Cura sempre permanente sem follow-up': [
    'Provides permanent cure without need for any longitudinal follow-up registries',
    'One-time cure with no requirement for durability monitoring or re-dosing',
  ],
  'Apenas para câncer pediátrico': [
    'Indication strictly limited to pediatric oncology applications',
    'Pediatric cancer-only use without broader monogenic or adult disease label',
  ],
  'Apenas teóricos sem aprovação': [
    'Theoretical constructs only with no current regulatory authorization',
    'Investigational candidates without pivotal trial data or approvals',
  ],
  'Bolsa stem cells autóloga sem editing': [
    'Autologous stem-cell harvest and reinfusion without any genetic editing component',
    'Self-cell collection used as supportive care without modification or vector',
  ],
  'Aspirin daily': [
    'Once-daily oral aspirin for primary cardiovascular prevention',
    'Generic low-dose aspirin antiplatelet without any cell or vector therapy',
  ],
  'Term babies routine': [
    'Routine application to term newborns rather than extreme prematurity edge cases',
    'Standard-care use in healthy term infants without specific gestational-age criterion',
  ],
  'Sem qualquer dispositivo': [
    'No device-based intervention available beyond conventional NICU support',
    'No specialized device exists outside standard incubator and ventilator equipment',
  ],
  'Apenas adult ECMO': [
    'Adult ECMO only without pediatric or neonatal extracorporeal life support',
    'Restricted to adult VV/VA ECMO without artificial-womb application',
  ],
  'Apenas Cushing': [
    'Cushing syndrome screening only without broader adrenal incidentaloma workup',
    'Limited to hypercortisolism evaluation without metanephrine or aldosterone screen',
  ],
  'Apenas T2D': [
    'Type 2 diabetes indication only without obesity, MASH, or CKD expansion',
    'T2D-only label without crossover into broader cardiometabolic disease',
  ],
  'Apenas em high-risk': [
    'Restricted to high-risk patient cohorts without expansion to intermediate or low risk',
    'High-risk-only indication retained without broadening to all-risk populations',
  ],
  'Wait 24 horas observation': [
    '24-hour observation window before any antibiotic or fluid resuscitation begins',
    'Delayed assessment over 24h before initiating sepsis bundle elements',
  ],
};

// Use a deterministic counter so each occurrence gets a different pool entry,
// avoiding repeated wording within the same set.
const counters = new Map();

function pick(pool, file, key) {
  const k = `${file}::${key}`;
  const idx = counters.get(k) || 0;
  counters.set(k, idx + 1);
  return pool[idx % pool.length];
}

// Catch-all generic transforms: rewrite any remaining short "Apenas X" / "Sem qualquer X"
// distractors using the suffix as a hint, producing a length-balanced sibling phrase.
function genericRewrite(line) {
  const m = line.match(/^(\s+- )(Apenas|Sem qualquer|Sem effect|Sem ação|Mesmo|Cura |Substitui |Substituto |Aumento )(.*)$/);
  if (!m) return null;
  const [, prefix, head, rest] = m;
  const suffix = rest.trim();
  if (!suffix || suffix.length > 80) return null;
  let out;
  if (head.startsWith('Sem qualquer')) {
    out = `No demonstrated ${suffix} in current evidence base or guideline framework`;
  } else if (head.startsWith('Sem effect')) {
    out = `No measurable effect on ${suffix} in pre-specified outcome analyses`;
  } else if (head.startsWith('Sem ação')) {
    out = `No regulatory or clinical action recommended regarding ${suffix}`;
  } else if (head.startsWith('Mesmo')) {
    out = `Comparable profile to ${suffix} without meaningful clinical advantage`;
  } else if (head.startsWith('Cura')) {
    out = `Definitive cure of ${suffix} without need for longitudinal follow-up`;
  } else if (head.startsWith('Substitui ') || head.startsWith('Substituto ')) {
    out = `Direct substitute for ${suffix} replacing it as the standard of care`;
  } else if (head.startsWith('Aumento')) {
    out = `Paradoxical increase in ${suffix} versus comparator arm`;
  } else {
    out = `Limited to ${suffix} without broader clinical applicability or alternative pathways`;
  }
  return `${prefix}${out}`;
}

function processFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  let changed = 0;
  for (const [filler, pool] of Object.entries(POOLS)) {
    const re = new RegExp(`^(\\s+- )${filler.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*$`, 'gm');
    src = src.replace(re, (_, prefix) => {
      changed++;
      return `${prefix}${pick(pool, file, filler)}`;
    });
  }
  // Generic pass for remaining short fillers
  src = src.split('\n').map(line => {
    const rewrite = genericRewrite(line);
    if (rewrite && rewrite !== line) { changed++; return rewrite; }
    return line;
  }).join('\n');
  if (changed > 0) {
    fs.writeFileSync(file, src);
    try { parse(src); console.log(`fixed ${path.basename(file)} (+${changed})`); }
    catch (e) { console.error(`PARSE BREAK ${file}: ${e.message.split('\n')[0]}`); }
  } else {
    console.log(`skip ${path.basename(file)} (no matches)`);
  }
}

for (const f of process.argv.slice(2)) processFile(f);
