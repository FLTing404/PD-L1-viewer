
摘要：
在肺癌的临床免疫治疗决策中，医生通常基于免疫组织化学（IHC）切片评估肿瘤组织中的 PD-L1 表达状态，并将肿瘤比例评分（TPS）作为辅助治疗方案选择的重要参考。然而，在实际临床流程中，TPS 评估高度依赖病理医生经验，医生需要在全切片图像中反复缩放，定位肿瘤区域并核查细胞膜染色状态，评估结果容易受到肿瘤与非肿瘤区域混杂、坏死组织和弱阳性表达等因素影响。为此，本文提出一个面向肺癌 PD-L1表达的交互式可视分析系统。系统支持多层级 PD-L1 表达状态识别，通过多尺度联动可视化呈现全局与局部的阳性、阴性分布，并自动计算 TPS 指标，帮助医生更高效地完成肿瘤区域核查、细胞级证据追溯和量化评估，从而实现更加智能、快捷、稳定和可解释的 PD-L1 辅助判读。
In clinical immunotherapy decision-making for lung cancer, pathologists commonly assess PD-L1 expression status from immunohistochemistry (IHC) slides and use the Tumor Proportion Score (TPS) as an important reference for treatment selection. However, in routine clinical workflows, TPS assessment remains highly dependent on pathologists’ experience. Experts need to repeatedly zoom in and out on whole-slide images, locate tumor regions, and inspect membranous staining patterns at the cellular level. This process is easily affected by mixed tumor and non-tumor regions, necrotic tissues, weak positive expression, and other complex pathological factors. To address these challenges, this paper presents an interactive visual analytics system for PD-L1 expression in lung cancer pathology. The system supports multi-level identification of PD-L1 expression states, presents global and local distributions of positive and negative regions through coordinated multi-scale visualization, and automatically computes TPS. The system helps pathologists perform tumor-region verification, cell-level evidence review, and quantitative TPS assessment more efficiently, thereby improving the consistency, interpretability, and usability of PD-L1-assisted pathological interpretation.
Keywards: PD-L1 assessment, Tumor Proportion Score, digital pathology, visual analytics, multi-scale visualization.

1. 引言
        肺癌是全球范围内发病率和死亡率均较高的恶性肿瘤之一，免疫治疗已成为其临床治疗中的重要手段。作为免疫治疗决策的重要依据，程序性死亡配体 1（programmed death-ligand 1, PD-L1）的表达水平通常通过免疫组织化学（immunohistochemistry, IHC）切片进行评估。其中，肿瘤比例评分（tumor proportion score, TPS）是肺癌 PD-L1 判读中常用的量化指标，其核心在于估计具有膜性 PD-L1 染色的肿瘤细胞在全部存活肿瘤细胞中的比例。准确的 TPS 评估能够为患者分层和治疗方案选择提供重要参考。因此，如何在高分辨率病理切片中高效、稳定地识别 PD-L1 表达状态，并辅助医生完成可信的 TPS 判读，是数字病理和临床免疫治疗中的重要问题。
        在实际临床流程中，TPS 判读仍高度依赖病理医生的经验。医生通常需要在超大尺寸的全切片图像中缩放和平移，首先定位肿瘤区域，再进一步观察局部区域中肿瘤细胞的膜染色情况，并根据经验对 TPS 进行肉眼估计。与直接计算阳性细胞比例不同，TPS 判读的关键并不仅在于识别 PD-L1 阳性细胞，更在于准确确定有效肿瘤区域和存活肿瘤细胞。在不同图像区域中，可能同时存在坏死组织、炎性细胞浸润、肿瘤与非肿瘤成分混杂等复杂情况；弱阳性表达、细胞密集分布、染色强度波动以及不同肺癌组织学亚型差异，也会进一步增加判读难度。医生通过肉眼进行粗略估计会导致出现判读差异。
        近年来，人工智能方法在数字病理图像分析中取得了快速发展，并在组织分割、细胞检测、病理分类和预后预测等任务中展现出较强能力。对于 PD-L1 IHC 图像，已有方法能够进行 patch 级表达状态分类、肿瘤区域识别或细胞级阳性/阴性判别，也有若干 TPS 计算工具被用于数字病理分析。然而，现有方法多侧重单一层级的自动识别或最终评分输出，无法进行多层级TPS可视化追溯和精细化判读。病理专家不仅需要知道 TPS 得分，还需要理解该得分来源于哪些肿瘤区域、哪些局部细胞分布模式。具体而言，PD-L1 辅助判读仍面临以下挑战。首先，病理切片标注成本高昂，细胞级标注和显式分割容易受到图像质量、细胞重叠和染色差异的影响，如何在全切片级图像中实现高效、稳定的多层级状态识别和 TPS 计算仍然具有挑战。其次，PD-L1 IHC 全切片图像通常具有超高分辨率和显著的多尺度特征，如何在全局分布、区域结构和细胞细节之间切换与联动分析也是一个重要问题。第三，单一 TPS 数值难以充分呈现评分背后的空间依据和细胞证据，如何帮助医生追溯评分来源并核查关键区域，是提升辅助判读可信度的关键。因此，临床研究亟需一种具备快速计算和全局追溯的交互式 PD-L1 表达辅助判读系统。
        可视分析是一种结合数据挖掘、人机交互和可视化技术的分析方法。通过将人工智能模型、量化统计分析和交互式可视化相结合，其能够把复杂的全切片图像和算法结果转化为医生可理解、可核查和可操作的视觉证据。基于此，本文提出一个面向肺癌 PD-L1 表达评估的交互式可视分析系统。系统支持从全片到细胞级的 PD-L1 表达状态识别，实现TPS 的一致性计算；通过多尺度联动视图，系统呈现全切片、patch 和细胞层面的 PD-L1 表达分布，实现可信评估。医生还可以手动选择感兴趣区域，系统自动生成 TPS 相关统计结果和可视化图表，实现灵活筛选和按需细查。最后提供Agent交互式问答，提高判读效率，实现智能、快捷、稳定和可解释的 PD-L1 辅助评估。本文的主要贡献如下：
1. 提出一套多层级 PD-L1 表达联合建模方法，能够同时支持 patch-level 表达分类和细胞级阳性/阴性判别，实现高效快速的多尺度TPS计算和细胞状态识别。
2. 提出一个面向肺癌 PD-L1 表达评估的交互式可视分析系统，支持从全片到细胞级的多层级判读、感兴趣区域选择、量化分析和智能评估，实现复杂切片的高效交互探索。
3. 基于真实肺癌 PD-L1 IHC 数据开展案例分析，结果表明该系统能够直观辅助专家进行切片浏览、筛查和判读分析，提升评估过程的一致性与效率。

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

数据描述：肺癌 PD-L1 IHC 数据并不是规则、连续、单一组织块的标准图像，而是更接近真实临床流程中的复杂玻片数据。一个患者样本在切片中可能呈现为多个分散组织片段，中间存在大面积空白是正常现象；部分样本来自穿刺活检，由于穿刺组织较长，包埋和切片后可能被分成两段或多段分布在玻片不同位置。部分图像中还同时包含患者组织和对照组织，例如左侧可能为患者组织，右侧可能为正常淋巴组织或对照组织。对照组织的作用主要是辅助判断染色是否成功、定位是否准确、是否存在正常阳性表达，而不应纳入患者 TPS 的计算。因此，该数据具有组织分布分散、患者组织与对照组织共存、活检与手术样本形态差异明显、有效分析区域需要人工或算法确认等特点。
研究动机和必要性：这类真实临床数据说明，PD-L1 TPS 辅助判读不能简单地对整张切片进行阳性细胞统计。如果系统无法区分患者组织、对照组织、正常淋巴组织、空白区域以及真正需要计算的肿瘤区域，就可能把不应参与计算的区域纳入 TPS，导致评分偏差。丁医生的反馈也表明，临床判读首先需要明确“哪些组织属于患者样本、哪些组织只是对照、哪些区域可以用于 TPS 计算”，然后再进一步观察肿瘤细胞膜染色情况。因此，本文研究的必要性不仅在于自动识别 PD-L1 阳性/阴性表达，更在于构建一个支持医生快速定位患者组织、排除对照区域、选择感兴趣肿瘤区域、并在 patch 级和细胞级进行联动核查的交互式可视分析系统。这样的系统能够避免单纯自动计算带来的误判风险，使 TPS 结果与具体组织区域和细胞级证据相对应，从而提升 PD-L1 辅助判读的准确性、稳定性和临床可信度。虽然
按照我之前的经验后面就是个简单分类穿刺活检还在一下模型表现可能会差点，严格用TPS的标准算应该会好点
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
 如图  所示，本系统的整体工作流程由自动化数据处理、多尺度可视化映射以及“人机协同”交互分析三个阶段构成。在第一阶段，我们集成了一个细胞感知蒸馏框架，在点监督 isCell 定位头的辅助下，将教师模型的细胞级语义迁移至轻量化学生骨干网络，从而在无需显式分割的情况下实现高效的细胞中心定位与特征采样。在第二阶段，系统利用共享编码器的双任务 Transformer 对细胞特征序列进行建模，同时完成细胞级 PD-L1 判别与 Patch 级 TPS 分级，并引入跨尺度一致性约束以确保局部证据与临床评分的统一。在第三阶段，这些分析结果被转化为交互式可视化环境，病理专家可以通过多视图联动和感兴趣区域（ROI）框选，实现从宏观热力图到微观细胞标注的即时导航，从而完成对 PD-L1 表达状态的闭环辅助判读。


5.2 算法介绍：（瑞琪补充算法介绍）
5.3 系统介绍：（系统的每个模块介绍）
数据集构建与样本形态学特征 
全切片图像（WSI）往往包含高度复杂的物理空间排版与形态学差异。为了验证 TPS-Vis 系统在复杂临床场景下的稳定性与跨癌种泛化潜力，本研究在浙二乳腺癌 IHC 数据集与 IGNITE 多中心数据集上进行了充分验证。然而，临床制片过程中的空间布局非标准化带来了巨大挑战。
样本形态映射： 本系统处理的病理玻片主要包含两种截然不同的临床采样形态：
手术切除样本： 视觉上呈现为大块的连续组织。该类样本具有极高的细胞密度与完整的肿瘤微环境，系统主要利用其进行宏观组织结构与空间异质性的可视分析。
空芯针穿刺活检样本： 视觉上呈现为细长的条状组织。受限于包埋工艺与蜡块尺寸，超长的穿刺样本在物理制片时常被切断并平行并排于同一载玻片中。因此，系统在解析此类 WSI 时，需将空间上分离的“双条带”或“多条带”在逻辑上聚合为单一患者的联合评估实体。
同片对照与假阴性规避： 遵循 IASLC 免疫组化质控指南，为了排除由 IHC 染色灵敏度不足导致的假阴性，数据集中的大量玻片采用了同片外部对照策略。通常，玻片的一侧为患者待测样本，另一侧为已知表达特征的正常组织作为对照。 在临床阅片逻辑中，对照组不仅用于底层生化灵敏度的验证，更为病理医生提供了基准的视觉染色定位。在临床阅片逻辑中，若患者样本呈现 PD-L1 阴性，系统需引导专家将视口平移至对照组区域。通过对比对照区已知正常组织的显色强度与抗原部位定位，专家能够有效校准视觉阈值，从而在高度异质性的患者样本区中精准剥离出真正的 PD-L1 阳性表达。






5.3.1 宏观导航与图库检索
左侧栏的核心设计目标是提供高效的数据入口与基于临床逻辑的靶向检索机制，避免用户在海量数据中进行盲目搜索。该模块由上下两部分组成：
标本浏览器： 在数据导入阶段，系统从服务端解析全切片图像的金字塔清单，并在左上角生成病例卡片。为了提升临床筛查效率，系统在客户端默认按平均 TPS 评分对病例进行降序排列，并通过状态短语（如 High PD-L1, Elevated, Low expressors）与高对比度边框进行视觉编码，使高表达风险病例脱颖而出。
Patch 图库： 位于左栏下半部的图库是连接宏观与微观的检索枢纽。系统首先过滤掉无细胞级数据的背景图像块，仅保留有效肿瘤区域。图库内置了基于临床评分标准的分档筛选器。当用户在图库中单击特定高风险 Patch 时，系统将触发“飞行定位（Fly-to-patch）”交互，驱动主视图瞬间平移缩放至该空间位置。此外，图库列表与中栏的局部 ROI 选区保持深度联动：令全片有效 Patch 集合为 P，当前选区为 ROI，图库仅渲染属于 P∩ROI 的交集图像块，并按预测 TPS 值（τ）动态重排。
5.3.2 焦点上下文联动与空间定量
中栏是系统的核心阅片与量化分析枢纽，占据了最大的屏幕空间，旨在解决超大分辨率图像在导航中的空间迷失痛点与异质性量化难题。
多尺度主阅片器与局部 ROI： 上半部分基于 OpenSeadragon 构建了平滑的图像金字塔渲染引擎。为了在不阻挡底层组织形态的前提下提供视觉捷径，系统利用核密度估计在 WSI 表面叠加了一层高亮度的 TPS 热力图。此外，用户可通过局部 ROI 工具在画面上框选感兴趣的肿瘤微环境。系统底层算法会自动将用户绘制的矩形吸附对齐至 512×512 像素的 Patch 网格，并实时提取空间交集内的特征数据。
TPS 分布总览与动态直方图： 中栏下半部分设计了高度定制化的 TPS 定量仪表盘。对于模型输出的每个 Patch 的预测得分 τ∈1，系统将其映射为细粒度的 0.1% 直方图分箱（Binning）： k \;=\; \mathrm{clamp}\bigl(\mathrm{round}(1000\,\tau),\,0,\,1000\bigr) 为使直方图的视觉分布完美契合病理四大临床阈值，系统在横轴（X 轴）引入了基于数据密度的比例尺映射（Proportional Axis Mapping）。记临床档位 b∈{Neg,T1,T10,T50} 中的 Patch 数量为 nb​，总 Patch 数为 Ntot​，则各临床档位在绘图区总宽度 Wplot​ 中分配的像素带宽 Wb​ 为： W_b \;=\; \begin{cases} \frac{n_b}{N_{\mathrm{tot}}}\,W_{\mathrm{plot}}, & N_{\mathrm{tot}}>0\\ \frac{1}{4}W_{\mathrm{plot}}, & N_{\mathrm{tot}}=0 \end{cases}该映射保证了直方图每个背景带内柱子的“总质量”精确等于该档位的 Patch 真实占比。同时，为防止局部极值导致直方图垂直方向的视觉饱和，系统引入了动态填充比 ρ（全片模式 ρ=0.9，ROI 模式 ρ=0.8）来计算 Y 轴的显示上界 Y_{\max} = \frac{\tilde{c}_{\max}}{\rho}​​。在此仪表盘中，用户可以通过观察直方图是否呈现双峰结构来敏锐地捕捉肿瘤微环境的空间异质性特征。
5.3.3 微观核查与细胞级追溯
右侧栏的目的是打破算法的“黑盒”特性，提供坚实的底层数据解释支持，从而帮助医生建立对量化评分的信任。
多图层预览带： 当主视图“飞行”至目标 Patch 后，右上方的预览模块会自动加载该区域的高倍图像。该模块支持多图层叠加（如 cell_class 细胞分类轮廓、heatmap_overlay 局部热力等），且允许用户在此微型视口内进行独立的缩放与平移。这一设计有效避免了在主视口中频繁切换图层导致的上下文丢失。
细胞级详情卡片： 预览带下方是一个富信息统计面板。该面板通过异步请求（GET .../cells）实时加载当前 Patch 内部所有细胞的精确坐标与分类概率。面板利用堆叠条形图（Stacked Bar）直观对比阴性与阳性肿瘤细胞的绝对计数，并计算局部的细胞加权 TPS 百分比。更重要的是，它同时展示了当前 Patch 的细胞基数在全片细胞总基数中的权重贡献比例。这种将“微观表达强度”与“宏观成分权重”并列展示的策略，构成了完整的证据追溯链条，有效修正了因局部高表达造成的视觉偏差。
5.3.4 自然语言问答机制
为提升系统的信息获取效率与医学解释性，系统引入 Pathology Insight Agent 作为统一的自然语言问答层，主要用于辅助医生理解复杂的量化指标与空间异质性特征。在整体架构设计上，系统明确剥离了复杂的交互编排与报告生成功能，采用“外层语义解析+内层受控检索”的轻量级分层策略。
在外层，系统接入通用大语言模型作为自然语言解析模块，当前实现采用 DeepSeek 模型对用户的请求进行语义理解与意图识别，并将其精准映射为当前病例、微观图像块、局部空间选区以及临床细胞阴阳性阈值等结构化上下文参数。
在内层，为了保障医疗场景的严谨性并彻底杜绝大模型的“幻觉”问题，Agent 被严格限制了系统操作与调度权限，其核心职能仅聚焦于基于事实的客观问答。当完成请求映射后，系统通过受控的数据接口，直接向底层数据库与后台计算服务发起检索，获取如全片最高 TPS 图像块、局部 ROI 与全局细胞计数对比等唯一的原始统计快照。
用户可以与 Agent 进行对话问答，但是需要特别说明的是，为了确保医学决策的安全性，我们预定义了一系列病理专家在临床阅片时可能高度关注的核心问题，并给出了预先计算的客观数据结果。系统的回答建立在这些唯一客观的预计算数值之上，通过读取结构化输出字段，并结合固定的文本模板完成填空式组织。系统所输出的病理洞察仅仅是对分析管线底层数值的规范化复述，而不是由大语言模型自由生成科学诊断结论，也不是通过视觉大模型识别图像内容后再进行主观推断，从而在提供灵活问答体验的同时，最大程度地保障了辅助判读的安全边界。
6. 案例分析：（找两个案例，作图并解释）
1）同片远距离对照样本的交互式锚定与比对效率验证
  常规的临床质控中，为了防范假阴性并提供视觉染色定位，制片时常将患者的空芯针穿刺样本与远端的正常淋巴结（外部对照组）置于同一载玻片上。这种物理上高度离散的排版导致全切片图像（WSI）中存在大面积的空白背景。E1 指出，在传统单视口阅片中，医生必须在患者与对照组之间进行长距离的手动平移，极易引发视觉疲劳与空间迷失。为验证本系统在多焦点、大留白场景下的探索效率，本案例导入一例典型“左患右对”排版的全切片图像。在底层数据准备阶段，系统基于 OpenSeadragon 加载金字塔瓦片，将 WSI 预先解构为附带预测 TPS 与细胞级分类的 512×512 网格片段（Patch），并剔除无效空白背景以过滤干扰。进入自顶向下的交互工作流后，用户首先利用导航概览瞬间将主视图锚定至左侧的“患者侧”组织岛，彻底越过大面积空白区域的无效平移；随后开启局部 ROI 工具框选病灶，系统迅速对齐底层网格，并驱动面板动态呈现细胞加权平均 TPS 与分档分布等量化统计，还可就该框选区域向提问。在微观核查环节，用户通过 Patch 图库（Patch Gallery）按档位筛选图像块，点击目标 Patch 即可触发“飞行定位（Fly-to-patch）”平滑跳转至对应空间位置，并结合右侧的高倍细胞级标注完成细粒度证据追溯。完成患者侧核查后，用户通过导航概览一键无缝跳转至右侧“对照侧”淋巴结，复用一致的 ROI 与图库检索框架完成视觉定标，探索末尾还可借助 Pathology Insight 助手基于统计快照生成结构化的客观数值摘要，从而在统一的交互框架下高效完成了跨越远距离留白的双侧读片与辅助判读。







2）局部高表达干扰下的边界病例判读/高异质性 PD-L1 样本中局部表达对全局判读的影响
PD-L1 表达在肿瘤微环境中常呈现高度的空间异质性：同一活检组织内可能同时并存极低表达与极高表达的病灶。若仅采用全局聚合指标，往往会掩盖局部极端的危险区域。此时，分析任务便从简单的“读取单一分数值”转变为“解释数据分布形状与其空间来源”。 本案例构造了一类典型的临床干扰场景：左侧为患者穿刺，右侧为对照。由于患者侧的穿刺组织沿扫描方向过长，在物理制片与网格划分时被切断为两块相邻的 Patch 区域（Strip A 与 Strip B）。全局统计显示，患者侧的总体 TPS 处于 35.7% 的关键边界区间，但局部的表达却发生极度分化：一块高达 61.2%，另一块仅为 13.9%。
在分析初始，系统底部的 TPS 分布总览 提供了全局的数据线索。该视图给出了 0.1% 细粒度 Bin 聚合后经比例尺映射的直方图，并与临床四档背景带严格对齐；同时，全片的 TPS 分配带 宏观呈现了各档位的混合比例。 在此视图中，直方图呈现出极其显著的双峰结构——一个主峰集中在 1% 附近的极低表达区，另一个次峰则出现在 50%−100% 的高表达区间。这种反常的形态分布构成了关键的可视化线索，向用户发出强烈提示：“全局均值不足以代表局部特征”，从而引导分析逻辑从宏观概览转向局部的空间拆解。
为了追溯这两个孤立波峰的空间来源，用户利用局部 ROI 工具对左侧的两块穿刺组织分别进行定向框选。 通过系统的多尺度视图联动，两侧 ROI 的差异被直观暴露：选中 Strip A 时，Selection ROI 面板显示其局部加权平均 TPS 高达 61.2%，且 Patch 图库中充满了高表达的图像块；而选中 Strip B 时，局部 TPS 骤降至 13.9%。在分析的最后，用户将视口移至右侧对照组织，将其作为“低表达参照语境”在同一交互范式下进行浏览。这种多维度的比对，有效强化了对患者侧局部高峰与巨大阴性基数的数据解释链条。







7. 专家反馈：（找专家反馈评估，说几句好话和中肯的评价）

8. Discussion and Limitation

9.  Conclusion


在临床实践中，病理专家通常需要通过 PD-L1 免疫组织化学（IHC）切片判读，从而对肿瘤预后效果进行评估。其中， TPS是最常用的PD-L1 评分指标，用于表征存活肿瘤细胞中膜阳性染色的比例。然而，现有 TPS 评分过程高度依赖人工阅片，易受切片空间异质性、肿瘤细胞与免疫细胞混杂以及染色强度不稳定等因素干扰，从而带来较强主观性；这一问题在弱阳性表达或细胞密集区域尤为突出。
专家通常需要在全切片图像上反复缩放与浏览，从整体组织结构中定位感兴趣区域，再进一步观察局部细胞膜染色情况，以综合判断阳性表达分布及其程度。尤其是在弱阳性表达区域、细胞密集区域以及肿瘤细胞与免疫细胞混杂区域中，切片判读不仅费时费力，而且容易受到阅片经验、视觉疲劳以及局部证据不充分等因素影响，进而导致 TPS 评分结果存在较强主观性。这种分析方式在实际应用中面临以下几个方面的挑战。
该方法在浙二乳腺癌 IHC 数据集与 IGNITE 数据集上验证，表现出稳定的分级性能与细胞级可视证据，并具备良好的跨癌种泛化潜力。
为此，我们提出一种细胞感知的弱监督蒸馏与双任务框架：以病理领域基础模型为教师在细胞掩码引导下提取高质量细胞特征，训练轻量学生网络并配备点监督细胞定位头，实现无掩码的细胞定位与特征采样；进一步构建细胞级分类与 patch 级 TPS 分级的双任务 Transformer，并通过跨尺度一致性约束对齐细胞阳性率与 TPS 预测，从而在不依赖密集分割标注的前提下提升评分的稳健性与可解释性。

