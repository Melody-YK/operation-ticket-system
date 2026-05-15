# requirements analyst学习文档

## 几个重要的工作流

- Phase 1: Requirements Discovery（第一阶段：需求发现）
- Phase 2: Value Sorting（第二阶段：价值排序）
- Phase 3:Requirements Analysis（第三阶段：需求分析）
- Phase 4Requirements Clarification （第四阶段：需求澄清）
- Phase 5:Requirements Validation（第五阶段：需求验证）
- Phase 6:Requirements Specification（第六阶段：需求规格化）可以根据要求输出不同的格式



本项目的落地流程：POWER.md 做了阶段判断

基于已有的prd，从第三阶段需求分析开始

它的落地链路是：

```text
原始需求/PRD
→ requirements-analyst POWER.md 判断流程
→ Phase 3 需求分析
→ Phase 4 需求澄清
→ Phase 5 需求验证
→ Phase 6 需求规格化
→ 实施计划/任务拆解
→ 前后端代码实现
→ 测试/构建/交付报告
```

```text
Phase 3：requirements.md / data-model.md
Phase 4：clarification.md
Phase 5：validation.md
Phase 6：prd.md / api.yaml / rtm.md
```

## 使用方式

- 先进行power的安装，通过自然语言描述要求Claude code使用已有的prd（原始需求）和调用requirements的power
- 示例：请读取当前项目中的原始 PRD，并使用 requirements-analyst power 的方法论生成需求工程产物。



对requirements文档进行完善更新，正常格式应该是每一个活动都有inevest检查的，但是生成的文档中只有第一个活动有invest检查

 **分析尚未完成**

 文档标题写着**状态：分析中**，且第14节「下一步」明确列出了：

 \- [ ] 进入 Phase 4：需求澄清（Clarification）

 INVEST 检查通常是在需求澄清阶段（Clarification）逐一完成的，这个文档目前只完成了初始分析（Phase 3），还没进入逐条精化的阶段。

![](/Users/melody/Library/Application Support/typora-user-images/image-20260515205406476.png)

![image-20260516074319737](/Users/melody/Library/Application Support/typora-user-images/image-20260516074319737.png)



![](/Users/melody/Library/Application Support/typora-user-images/image-20260515220401858.png)

追溯图并不完整

![image-20260515220428144](/Users/melody/Library/Application Support/typora-user-images/image-20260515220428144.png)

关于原型图