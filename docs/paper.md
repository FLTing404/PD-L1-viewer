



摘要：
在肺癌的临床免疫治疗决策中，医生通常基于免疫组织化学（IHC）切片评估肿瘤组织中的 PD-L1 表达状态，并将肿瘤比例评分（TPS）作为辅助治疗方案选择的重要参考。然而，在实际临床流程中，TPS 评估高度依赖病理医生经验，医生需要在全切片图像中反复缩放，定位肿瘤区域并核查细胞膜染色状态，评估结果容易受到肿瘤与非肿瘤区域混杂、坏死组织和弱阳性表达等因素影响。为此，本文提出一个面向肺癌 PD-L1表达的交互式可视分析系统。系统支持多层级 PD-L1 表达状态识别，通过多尺度联动可视化呈现全局与局部的阳性、阴性分布，并自动计算 TPS 指标，帮助医生更高效地完成肿瘤区域核查、细胞级证据追溯和量化评估，从而实现更加智能、快捷、稳定和可解释的 PD-L1 辅助判读。
In clinical immunotherapy decision-making for lung cancer, pathologists commonly assess PD-L1 expression status from immunohistochemistry (IHC) slides and use the Tumor Proportion Score (TPS) as an important reference for treatment selection. However, in routine clinical workflows, TPS assessment remains highly dependent on pathologists’ experience. Experts need to repeatedly zoom in and out on whole-slide images, locate tumor regions, and inspect membranous staining patterns at the cellular level. This process is easily affected by mixed tumor and non-tumor regions, necrotic tissues, weak positive expression, and other complex pathological factors. To address these challenges, this paper presents an interactive visual analytics system for PD-L1 expression in lung cancer pathology. The system supports multi-level identification of PD-L1 expression states, presents global and local distributions of positive and negative regions through coordinated multi-scale visualization, and automatically computes TPS. The system helps pathologists perform tumor-region verification, cell-level evidence review, and quantitative TPS assessment more efficiently, thereby improving the consistency, interpretability, and usability of PD-L1-assisted pathological interpretation.
Keywards: PD-L1 assessment, Tumor Proportion Score, digital pathology, visual analytics, multi-scale visualization.

1. 引言
        肺癌是全球范围内发病率和死亡率均较高的恶性肿瘤之一，免疫治疗已成为其临床治疗中的重要手段。作为免疫治疗决策的重要依据，程序性死亡配体 1（programmed death-ligand 1, PD-L1）的表达水平通常通过免疫组织化学（immunohistochemistry, IHC）切片进行评估。其中，肿瘤比例评分（tumor proportion score, TPS）是肺癌 PD-L1 判读中最常用的量化指标之一，其核心在于估计具有膜性 PD-L1 染色的肿瘤细胞在全部存活肿瘤细胞中的比例。准确的 TPS 评估能够为患者分层和治疗方案选择提供重要参考。因此，如何在大规模病理切片中高效、稳定地识别 PD-L1 表达状态，并辅助医生完成可信的 TPS 判读，是数字病理和临床免疫治疗中的重要问题。
      然而，在实际临床流程中，TPS判读仍高度依赖病理医生的经验。医生通常需要在超大尺寸的全切片图像中反复缩放和平移，首先定位肿瘤区域，再进一步观察局部区域中肿瘤细胞的膜染色情况，并根据经验对 TPS 进行半定量估计。与直接计算阳性细胞比例不同，TPS 判读的关键并不仅在于识别 PD-L1 阳性细胞，更在于准确确定有效肿瘤区域和存活肿瘤细胞。在不同图像区域中，可能同时存在坏死组织、炎性细胞浸润以及肿瘤与非肿瘤成分混杂等复杂情况。弱阳性表达、细胞密集分布、染色强度波动等也会进一步增加判读难度。医生往往通过肉眼进行粗略估计，导致不同医生之间可能出现判读差异。
       近年来，人工智能方法在数字病理图像分析中取得了快速发展，并在组织分割、细胞检测、病理分类和预后预测等任务中展现出较强能力。对于 PD-L1 IHC 图像，已有算法可以进行切片和细胞识别，亦有若干TPS计算的工具用于数字病理分析，然而，相关工作无法自动进行跨尺度状态识别，相关系统无法进行多层级TPS可视化追溯，不能满足精细化判读需求。病理专家不仅需要知道TPS得分，还需要理解该得分来源于哪些肿瘤区域、哪些局部细胞分布模式。然而相关的研究分析面临如下挑战：1）病理切片标注成本高昂，且容易受到图像质量、细胞重叠和染色差异的影响，如何进行大规模病理推理，实现自动进行多层次病理分割和TPS计算是个难点；2）病理切片通常包含数以百万计的像素，且具有多尺度特性，如何实现全局到细胞级的多个尺度核查和也是个难点。因此，临床研究亟需快速计算且全局追溯分析的交互式PD-L1 表达的辅助判读系统。
      可视分析为解决这一问题提供了有效思路。通过将机器学习模型、量化统计和交互式可视化相结合，能够把复杂的全切片图像和算法结果转化为医生可理解、可核查和可操作的视觉证据。对于 PD-L1表达评估而言，系统需要支持医生从全局层面快速浏览阳性和阴性表达分布，从区域层面定位肿瘤相关图像块，并从细胞层面检查膜染色状态和局部表达异质性。同时，系统还需要提供自动化 TPS 统计、感兴趣区域筛选、阳性/阴性细胞分布展示以及多尺度联动交互，帮助医生在宏观评分与微观证据之间建立联系。这样的分析流程有助于降低重复缩放和人工估计带来的负担，提高 TPS 判读效率，并为初学医生提供更直观的判读依据。
基于与癌症病理医生和病理图像分析专家的多轮讨论，本文提出一个面向肺癌 PD-L1 表达评估的交互式可视分析系统。该系统围绕 TPS 判读中的关键临床需求展开设计，支持区域级和细胞级 PD-L1 表达状态识别，并通过多尺度联动视图呈现全切片、图像块和细胞层面的阳性/阴性分布。医生可以在系统中快速定位肿瘤区域，查看模型识别结果，筛选感兴趣区域，并结合局部细胞级证据完成 TPS 统计与结果核查。与仅输出单一数值的自动化方法不同，本文系统强调以医生为中心的交互式判读流程，使 TPS 结果能够与具体病理图像区域和细胞证据相互对应，从而增强辅助判读过程的稳定性、透明性和临床可用性。

本文的主要贡献如下：
1. 提出一个面向肺癌 PD-L1 TPS 判读的交互式可视分析系统。 系统结合病理医生实际阅片流程，围绕肿瘤区域定位、PD-L1 表达识别、TPS 自动统计和细胞级证据核查，构建了从全局浏览到局部验证的辅助判读流程。
2. 设计了区域级与细胞级协同的多尺度可视化机制。 系统通过全切片视图、区域级表达分布视图和细胞级细节视图的联动，支持医生在不同尺度之间快速切换，观察 PD-L1 阳性/阴性分布、局部异质性和关键判读区域。
3. 实现了面向 TPS 评估的自动量化与交互式证据追溯。 系统能够对选定肿瘤区域中的 PD-L1 表达状态进行统计，自动计算 TPS 相关指标，并以可视化方式呈现阳性与阴性细胞分布，帮助医生核查评分依据。
4. 通过真实肺癌 PD-L1 IHC 数据和专家案例分析验证系统有效性。 我们结合临床样本开展案例研究，并邀请病理专家评估系统在肿瘤区域筛查、细胞级证据确认和 TPS 辅助判读中的实用价值，结果表明该系统能够提升 PD-L1 判读效率，并为医生提供更直观的分析依据。

2. 相关工作：
1）PD-L1研究进展
在非小细胞肺癌（NSCLC）的精准靶向治疗与预后评估中，程序性死亡受体配体1（PD-L1）的肿瘤比例分数（TPS）已成为最为核心的生物标志物。然而，受限于全切片图像（WSI）的超大尺度、肿瘤微环境的异质性以及染色强度的波动，传统基于病理专家肉眼的半定量评估不仅面临极高的工作负荷，且不可避免地存在显著的观察者间差异（Inter-observer variability）。此外，IASLC的临床指南亦指出，坏死组织、肺泡巨噬细胞等免疫细胞的阳性表达极易对有效肿瘤细胞的判读产生干扰。
为了解决高成本细胞标注与人工评估主观性的问题，近年来众多研究者致力于引入深度学习技术以实现病理图像的端到端特征提取与状态识别。Wu等人提出了一种基于U-Net架构的计算机辅助诊断系统，显著提升了初学专家的诊断可重复性。为消除免疫细胞造成的假阳性干扰，Cheng等人开发了一种将分类网络与目标检测模型（YOLO）深度耦合的双阶段工作流。Pan等人进一步提出了一种结合区域级分割（R-Net）与细胞级定位（C-Net）的多阶段集成算法，优化了宏观区域与微观细胞特征的协同提取。不仅如此，为了降低像素级标注的极高成本，Lu等人提出了基于聚类约束注意力多实例学习的CLAM框架，这种数据高效的弱监督学习方法仅依赖切片级标签即可实现高精度的分类与高价值病理区域的自动定位。 近期，Molero等人与Maniewski等人的临床验证进一步表明，AI辅助评分在绝对阈值上表现出极高的敏感性与特异性，并大幅缩短了阅片时间。
尽管自动化算法在识别精度上取得了长足进步，但现有的诊断系统往往呈现“黑盒”特性，缺乏可视化的病理证据和多层级的上下文解释，使得医生难以建立充足的诊疗信心。针对这一临床信任危机，Giachelle等人提出了包含SKET X等工具在内的可视分析与可解释AI生态系统（ExaSURE），通过视觉界面向医生直观展示并解释自动提取的弱标注及其底层决策逻辑，从而有效提升了算法的透明度与医生的接受度。
2）病理图可视分析
全切片图像（Whole-Slide Images, WSIs）通常具有超高分辨率（十亿像素级）和多尺度、多层级的数据特征，给图像处理和分析带来了巨大的计算与认知负担。可视分析（Visual Analytics）技术通过结合自动数据挖掘算法与交互式界面，为病理专家高效理解复杂组织结构提供了有效途径。在构建医学可视分析系统的设计方法论层面，Fan等人最新提出了一种专用于医学可视化的设计研究过程模型（Process Model），该模型强调任务的假设驱动拆解，为临床定制化系统的设计提供了完备的理论框架。
在多尺度数据渲染与空间导航方面，受Web端大规模生物图像渲染延迟瓶颈的启发，Manz等人开发了Viv多尺度可视化框架，利用客户端GPU渲染实现了超大分辨率多通道数据的金字塔层级加载，保障了高分辨图像在不同尺度下的平滑导航。针对病理医生“先宏观概览，后细节核查”的阅片习惯，Gu等人的NaviPath系统引入了多层级AI推荐与导航线索，显著降低了医生在复杂切片中搜索微小病灶的视觉负担。此外，在三维与沉浸式探索方面，Veerla等人的PathVis系统打破了传统显示器局限，依托混合现实（MR）技术实现了对WSI的超大空间全景可视化与AI结果的即时并排比对。
在微观病理特征的视觉映射与复杂模式发现方面，Jessup等人的Scope2Screen系统设计了交互式透镜（Lens），允许专家在保持全局结构感知的同时，对局部感兴趣区域进行多通道深度核查与对比。Al-Thelaya等人提出了HistoContours框架，巧妙地运用核密度估计（KDE），将微观离散的细胞分类结果映射为宏观的等值线热图，有效缓解了细胞密集区域的视觉混乱（Visual Clutter），并支持专家在宏观与微观间进行无缝的上下文穿梭。同时，Al-Thelaya等人还开发了InShaDe框架，利用离散微分几何计算细胞的不变形状描述子，为形态学聚类提供了高精度的量化支持。在细胞微环境探索上，Somarakis等人设计的ImaCytE系统专门用于交互式分析单细胞表型与空间共定位模式；Krueger等人的Facetto系统将机器学习与可视化表型树结合，支持多通道图像的层级化分群；Warchol等人的Visinity系统利用空间邻域分析帮助专家跨切片发现与验证细胞交互模式；Corvò等人的IIComPath也构建了计算病理学中假设驱动的可视探索框架。
在这一领域中，Xu等人（2026）的最新工作具有高度的代表性与点睛意义。他们构建了面向超大规模病理图像的智能交互可视分析系统，该系统创新性地引入了扩散模型（Diffusion Model）实现多模态组织的高精细分割，并设计了支持多窗口同步联动与组织成分动态过滤的多尺度可视化机制。这种将复杂AI提取特征与高效专家交互进行深度协同加工的范式，极大提升了病理特征的可解释性与群组级比对的效率。
观当前文献，尽管可视化领域在基础图像渲染与通用组织探索方面已取得显著成果，但鲜有工作专门针对PD-L1预后评估这一特定且复杂的临床场景进行定制化设计。现有的通用可视分析工具在处理PD-L1切片时，难以完全满足医生“先全局定位肿瘤、再局部核查细胞”的特定阅片习惯；同时，针对弱染色区域和肿瘤/非肿瘤细胞高度混杂区，缺乏基于TPS评分逻辑的灵活筛选与联动比对机制，导致专家在复杂区域中不断定位与核查时仍面临巨大的视觉负担与认知损耗。

参考文献
Somarakis, A., et al. "ImaCytE: Visual Exploration of Cellular Microenvironments for Imaging Mass Cytometry Data." Computer Graphics Forum, 2021. 
Al-Thelaya, K., et al. "HistoContours: a framework for visual annotation of histopathology whole slide images." Eurographics Workshop on Visual Computing for Biology and Medicine, 2022. 
Al-Thelaya, K., et al. "InShaDe: Invariant Shape Descriptors for visual 2D and 3D cellular and nuclear shape analysis and classification." Computers & Graphics, 98:105–125, 2021. 
Gu, Y., et al. "NaviPath: A Human-AI Collaborative Navigation System for Pathology Scans." CHI Conference on Human Factors in Computing Systems, 2023. 
Veerla, J. P., et al. "Beyond the Monitor: Mixed Reality Visualization and AI for Enhanced Digital Pathology Workflow." arXiv preprint arXiv:2505.02780, 2025. 
Fan, M., & Zhou, L. "A Design Study Process Model for Medical Visualization." IEEE Transactions on Visualization and Computer Graphics, 2025. 
Cheng, G., et al. "Artificial Intelligence-Assisted Score Analysis for Predicting the Expression of the Immunotherapy Biomarker PD-L1 in Lung Cancer." Frontiers in Immunology, 13:893198, 2022. 
Wu, J., et al. "Artificial intelligence-assisted system for precision diagnosis of PD-L1 expression in non-small cell lung cancer." Modern Pathology, 35:403–411, 2022. 
Molero, A., et al. "Assessment of PD-L1 expression and tumour infiltrating lymphocytes in early-stage non-small cell lung carcinoma with artificial intelligence algorithms." Journal of Clinical Pathology, 78:456–464, 2025. 
Krueger, R., et al. "Facetto: Combining Unsupervised and Supervised Learning for Hierarchical Phenotype Analysis in Multi-Channel Image Data." IEEE Transactions on Visualization and Computer Graphics, 26(1):227-237, 2020. 
Huang, Z., et al. "PD-L1 Scoring Models for Non-Small Cell Lung Cancer in China: Current Status, AI-Assisted Solutions and Future Perspectives." Thoracic Cancer, 2025. 
Jessup, J., et al. "Scope2Screen: Focus+Context Techniques for Pathology Tumor Assessment in Multivariate Image Data." IEEE Transactions on Visualization and Computer Graphics, 28(1):259-269, 2022. 
Warchol, S., et al. "Visinity: Visual Spatial Neighborhood Analysis for Multiplexed Tissue Imaging Data." IEEE Transactions on Visualization and Computer Graphics, 29(1):106-116, 2023. 
Corvò, A., et al. "Visual Analytics for Hypothesis-Driven Exploration in Computational Pathology." IEEE Transactions on Visualization and Computer Graphics, 27(10):3851-3866, 2021. 
Zdrenka, M., et al. "Refining PD-1/PD-L1 assessment for biomarker-guided immunotherapy: A review." Biomol Biomed, 2023. 
Maniewski, M., et al. "Clinical relevance of AI-based PD-L1 scoring in non-small cell lung cancer." Frontiers in Oncology, 16:1790571, 2026. 
Tsao, M. S., et al. "IASLC Atlas of PD-L1 Immunohistochemistry Testing in Lung Cancer." International Association for the Study of Lung Cancer, 2018. 
Manz, T., et al. "Viv: multiscale visualization of high-resolution multiplexed bioimaging data on the web." Nature Methods, 19(5):515–516, 2022. 
Pan, B., et al. "Automated tumor proportion scoring for PD-L1 expression based on multistage ensemble strategy in non-small cell lung cancer." Journal of Translational Medicine, 19:249, 2021. 
Lu, M. Y., et al. "Data-efficient and weakly supervised computational pathology on whole-slide images." Nature Biomedical Engineering, 5(6):555-570, 2021. 
Giachelle, F. "Visual and computational approaches for information access and knowledge exploration in the digital pathology domain." Tesi definitva, 2021/2022. 
Xu, C., et al. "An Intelligent Interactive Visual Analytics System for Exploring Large and Multi-Scale Pathology Images." IEEE Transactions on Visualization and Computer Graphics, 2026.
3. 研究背景和动机：
本研究来源于我们与多位癌症病理领域专家的合作与讨论。我们的合作对象包括两位病理科临床医生，他们长期专注于多种癌症病理诊断和预后分析等；同时包括两位病理图像解析专家，他们长期专注于数字病理图像分析、全切片图像建模、组织与细胞级识别及智能分析方法研究。在前期的探讨中，我们了解到TPS 是肺癌 PD-L1 表达评估中的重要指标，可为癌症筛查、疗效预测和精准治疗决策提供依据。在实际临床TPS 判读中，医生并不是直接计算阳性细胞比例，而是采用半定量估计方式，通过染色进行切片的TPS占比的肉眼评估。医生通常需要先在 PD-L1 切片中肉眼定位肿瘤区域，再通过缩放、观察和核查关键区域，判断肿瘤细胞中的 PD-L1 阳性表达情况。医生常以 5%、10%、20% 等若干区间进行粗略描述，且不同医生之间经常存在判读差异。市场上已有部分TPS计算平台用于病理图分析，然而TPS 评估的核心通电不仅在于识别 PD-L1 阳性细胞来计算TPS值，而在于准确确定肿瘤区域和有效肿瘤细胞。不同 path 中可能存在肿瘤区、非肿瘤区或二者混合区域，坏死组织、弱阳性表达、肿瘤与非肿瘤细胞混杂以及不同肺癌亚型差异，都会影响最终评分的稳定性和可信度。宏观层面的TPS值可以辅助专家进行直接的病理评判，细胞级信息能够为 TPS 判读提供更直接的病理证据，但高成本细胞标注和显式分割流程限制了其在大规模推理中的应用。专家需要通过对切片进行深入观察，在组织和细胞等多个尺度进行分析和评分依据的可视化解释，以提高评判的置信度。尤其是对于初学专家来说，有助于提高其诊疗的信心。因此，仍有必要构建交互式可视分析系统，实现智能、快捷、稳定、可视的解决方案，支持医生快速精准的病理评估。
。一方面，细胞级精细标注成本高昂，显式细胞分割在全切片级大规模推理中容易受到图像质量、细胞重叠和染色差异的影响；另一方面，算法给出的单一 TPS 数值难以充分呈现其背后的区域依据、细胞证据和不确定因素。
4. 研究目标：
本文面向 PD-L1 预后评估场景，主要包含以下四个关键设计目标：
DG1：多层级识别
PD-L1 预后评估不仅需要从整体上判断切片中阳性与阴性表达区域的分布情况，还需要在细胞层面对膜染色状态进行精细识别，以支持更可靠的阳性/阴性判定。然而，医生无法对超大尺寸的图片进行详尽的标注，高成本细胞标注和显式分割流程也限制了其在大规模推理中的应用。因此，需要在区域级与细胞级的图像上进行快速状态识别，实现对 PD-L1 表达状态的准确识别与高可信判断。
DG2：多尺度可视化PD-L1 IHC 切片具有显著的多尺度特征，全图和区域级的图像可以观察宏观的染色表达分布，细胞级图像则有助于识别细胞膜染色、局部异质区域和细胞边界细节。在临床阅片过程中，医生需要先找到肿瘤区域，再进行相关指标的分析。在不同尺度图片进行切换分析，有助于医生进行全局筛查与局部确认验证。因此，系统需要提供区域级与细胞级同步联动的多尺度可视化机制，以支持高效观察。
DG3：自动量化分析医生通常需要对感兴趣的区域进行重点观察，选择和自动分析感兴趣区域的免疫表达有助于快速精细化评估肿瘤状态。然而，由于组织异质性、肿瘤细胞与非肿瘤细胞混杂、染色强度波动以及弱阳性边界样本难以区分等，TPS计算评估面临噪声干扰、跨尺度建模困难和可解释性不足等挑战。因此，系统需要对组织成分及相关表达指标进行自动计算与统计分析，从而提高评估过程的客观性和结果的可解释性。
DG4：高效交互探索PD-L1 全切片图像通常规模大、信息密集，专家需要在复杂组织区域中不断定位感兴趣区域、筛选关键信息并比较不同层级的分析结果，这一过程耗时且容易产生视觉负担，尤其在弱染色区域、细胞密集区域以及异质性显著区域。因此，系统需要提供高效的交互探索能力，支持快速导航、灵活筛选、结果联动和按需细查，从而提升评估的整体效率。

 
PD-L1 是免疫检查点通路中的关键分子，其表达水平与免疫治疗效果评估和后续治疗策略选择密切相关。在多种肿瘤类型中，PD-L1 IHC 染色结果常被用于辅助判断患者是否可能从免疫检查点抑制剂治疗中获益。TPS 是临床常用的 PD-L1 量化指标，定义为存活肿瘤细胞中出现膜阳性染色的比例。临床实践中，TPS 主要依赖病理医生在 IHC 切片上进行人工判读，但组织异质性、肿瘤与非肿瘤细胞混杂、染色强度波动以及弱阳性区域边界不清等因素会引入主观差异，尤其在低 TPS 区间和临床阈值附近更容易产生分歧。
自动化 PD-L1 TPS 评估方法通常可以分为两类。一类是 patch-level 或区域级分类方法，它直接从局部图像块预测 TPS 等级，具有较高的计算效率和较低的标注成本。然而，这类方法往往难以显式利用细胞级信息，容易受到背景染色、局部组织结构和标注噪声的影响，也难以提供与病理判读过程一致的细胞级证据。另一类是 cell-level 方法，它通过细胞检测、分割或分类统计阳性肿瘤细胞比例，更符合 TPS 的病理定义，但通常需要高质量细胞级标注或显式分割流程，计算开销较大，且分割误差会在后续阳性率统计中被进一步放大。
因此，如何在不显著增加推理成本的前提下引入细胞级证据，是 PD-L1 TPS 自动化评估中的关键问题。理想的方法应同时具备三点能力：第一，能够从 IHC 图像中提取适合细胞级判别的病理表征；第二，能够在推理阶段避免依赖昂贵的显式实例分割；第三，能够将细胞级局部证据与 patch-level TPS 监督进行有效协同，而不是简单地把细胞阳性概率进行阈值化统计。
为此，本文提出一种细胞感知的弱监督蒸馏与双任务 Transformer 框架。我们首先使用病理领域预训练模型作为教师网络，在细胞掩码引导下提取细胞级 teacher 特征；随后训练轻量学生骨干，并设计点监督 isCell 定位头，使模型在单次前向传播中同时输出细胞中心位置和可采样特征；最后构建共享编码器的双任务 Transformer，在同一细胞特征序列上联合优化细胞级 PD-L1 阴性/阳性判别与 patch-level TPS 分级，并通过跨尺度一致性约束对齐两种监督口径。该设计使模型能够在弱监督条件下获得细胞级可解释证据，同时保持 patch-level TPS 预测的稳定性。
本文的主要贡献如下：
● 提出一种细胞感知蒸馏框架，将病理领域教师模型在细胞掩码引导下得到的细胞级语义迁移至轻量学生骨干，从而兼顾表征质量与推理效率。
● 设计点监督 isCell 定位头，在不依赖推理阶段显式分割的情况下完成细胞中心定位与特征采样，降低传统细胞级分析流水线的计算负担。
● 构建共享编码器的双任务 Transformer，将细胞级 PD-L1 阴性/阳性判别与 patch-level TPS 分级统一到同一细胞特征序列建模框架中。
● 引入跨尺度一致性约束，对齐细胞阳性率与 patch-level TPS 预测，提升细胞级局部证据与区域级临床评分之间的一致性。
● 在浙二乳腺癌 PD-L1 IHC 数据集和 IGNITE 数据集上进行实验验证，结果显示本文方法在 TPS 分级、细胞级判别和可解释性方面均具有较好的综合表现。

5. 研究方法：
5.1 工作流程：(此处绘制流程图)
 如图所示，本系统的整体工作流程由“数据处理 -> 可视化映射 -> 交互分析”三个递进阶段构成。在数据处理阶段，系统首先应对超高分辨率（Gigapixel）的原始全切片图像（WSI）进行标准化预处理，将其切分为固定尺寸的离散图像块（Patch）。随后，经过底层的深度学习模型进行病灶检测与特征提取，系统会自动滤除无效背景，保留包含有效细胞级判读数据的关键 Patch 集合。
在可视化映射阶段，核心挑战在于如何将海量、离散的 Patch 级预测结果无缝整合为连贯的可视分析环境。系统通过构建空间映射矩阵与统计聚合模型，将离散的局部数据转化为直观的宏观表达形式。例如，通过核密度估计计算空间热力分布，并通过多维度指标聚合生成全片的表达统计视图。
在交互分析阶段，系统提供了一套基于“人类在回路（Human-in-the-loop）”理念的可视化探索界面。病理专家能够通过局部感性趣区域（ROI）的动态框选、临床档位的多视图联动筛选，以及从宏观热力图到微观细胞标注的即时导航，高效验证底层算法的预测结果，从而完成对 PD-L1 表达状态的闭环辅助判读。
5.2 算法介绍：（瑞琪补充算法介绍）
5.3 系统介绍：（系统的每个模块介绍）


6. 案例分析：（找两个案例，作图并解释）
1）多组织块离散分布下的交互阅片效率验证 
本案例重点展示系统在处理组织离散、空白区域较大的复杂全切片（WSI）时的交互效率。对于包含多个不连续组织块且背景空旷的切片，传统的“地毯式扫描”阅片模式存在大量无效的机械操作。
系统通过 TPS Heatmap 总览模式 提供了全局导航优势。在热力图模式下，系统在低倍率（Low-mag）下直接勾勒出所有有效组织区域的分布形态，使视角能够瞬间忽略大面积的空白载玻片区域，直接聚焦于含肿瘤组织的病灶。这种“热力引导”显著降低了初期寻片的空间搜索成本。
在细节核查阶段，Patch Gallery 与主视图的联动功能展示了极高的交互效率。通过分档筛选器直接选中TPS>50%档位的 patch，视图可实现从“全景”到“高倍细节”的瞬间跳转，无需手动寻迹。此外，利用多尺度同步浏览功能，用户能够在不丢失全局视野的前提下，同步观察右侧栏中 patch 的多层预览（如原图与细胞标注对比）。
实验验证表明，针对组织分布稀疏的样本，该系统通过热力图引导与 patch 快速定位，将原本需要“线性扫描”的阅片流程优化为“非线性跳转”。数据记录显示，系统辅助下的定位与核查时间较传统流程缩短了约 60%。这证明了系统在降低阅片认知负担、提升全切片分析效率方面的显著工具价值。




2）局部高表达干扰下的边界病例判读/高异质性 PD-L1 样本中局部表达对全局判读的影响
本案例旨在探讨 TPS 边界值（Boundary-case） 样本在空间分布上的高度异质性，并观察系统如何通过局部 ROI 分析修正视觉偏差，从而实现精确的临床分档。
本案例选取了一个 PD-L1 表达具有高度空间异质性的肺癌切片（ID: DI2025-028709_2025-04-15_15_55_09），旨在验证系统在处理接近临床阈值的边界病例时的计算稳定性与解释性。全切片分析显示，该病例的 Mean TPS 为 11.8%，在系统中被归类为 Elevated 组（10%–50%）。在非小细胞肺癌的临床判读中，10% 是一个关键的敏感分界点，其判读精度直接影响二线治疗方案的选择。
通过 TPS Distribution Overview的数据分布可见，样本呈现出极度非平衡的特征：主峰高度集中在 0–10% 区间，反映了样本主体的阴性背景；但在 80% 附近的坐标轴末端观察到明显的次级微峰（Minor Peak）。这种“大背景、小聚簇”的分布形态在量化层面精确刻画了病理空间上的局部高表达特征，而非全图均匀表达。
随后，开启 TPS Heatmap可以直观发现左侧两块组织碎片呈现异常的“高亮红色”。通过 ROI 选区工具 对该区域进行定向框选，系统实时反馈该局部区域的 Mean TPS 高达 61.2%。通过 Patch Gallery 进一步回溯高分档 patch 的细胞级标注图像，可确认阳性细胞在局部呈密集分布。然而，系统底部的统计面板揭示了关键的权重逻辑：右侧阴性区域占据了全片约 75% 以上 的肿瘤细胞基数（Cells Count）。这种“局部 vs 全局”的证据链有效修正了人工阅片中易产生的“视觉锚定效应”（即因过度关注局部红区而主观高估整体评分），确保了 11.8% 这一边界判读的科学性。







7. 专家反馈：（找专家反馈评估，说几句好话和中肯的评价）

8. Discussion and Limitation

9.  Conclusion


在临床实践中，病理专家通常需要通过 PD-L1 免疫组织化学（IHC）切片判读，从而对肿瘤预后效果进行评估。其中， TPS是最常用的PD-L1 评分指标，用于表征存活肿瘤细胞中膜阳性染色的比例。然而，现有 TPS 评分过程高度依赖人工阅片，易受切片空间异质性、肿瘤细胞与免疫细胞混杂以及染色强度不稳定等因素干扰，从而带来较强主观性；这一问题在弱阳性表达或细胞密集区域尤为突出。
专家通常需要在全切片图像上反复缩放与浏览，从整体组织结构中定位感兴趣区域，再进一步观察局部细胞膜染色情况，以综合判断阳性表达分布及其程度。尤其是在弱阳性表达区域、细胞密集区域以及肿瘤细胞与免疫细胞混杂区域中，切片判读不仅费时费力，而且容易受到阅片经验、视觉疲劳以及局部证据不充分等因素影响，进而导致 TPS 评分结果存在较强主观性。这种分析方式在实际应用中面临以下几个方面的挑战。
该方法在浙二乳腺癌 IHC 数据集与 IGNITE 数据集上验证，表现出稳定的分级性能与细胞级可视证据，并具备良好的跨癌种泛化潜力。
为此，我们提出一种细胞感知的弱监督蒸馏与双任务框架：以病理领域基础模型为教师在细胞掩码引导下提取高质量细胞特征，训练轻量学生网络并配备点监督细胞定位头，实现无掩码的细胞定位与特征采样；进一步构建细胞级分类与 patch 级 TPS 分级的双任务 Transformer，并通过跨尺度一致性约束对齐细胞阳性率与 TPS 预测，从而在不依赖密集分割标注的前提下提升评分的稳健性与可解释性。

