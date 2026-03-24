# StyleKit: Liquid Glass Design Rules

> Apple Liquid Glass 风格的高级毛玻璃效果。通过高斯模糊、饱和度增强、多层内发光和色散边缘，创造出光在玻璃中流动的真实质感。

## Philosophy
Liquid Glass 是 Apple 在 WWDC25 推出的设计语言的精髓提炼。它不是简单的半透明加模糊，而是模拟真实玻璃的光学特性：折射、色散、内发光、高光边缘。

## Rules

### Do
- 使用高模糊值 backdrop-blur-[40px] 或 backdrop-blur-[60px]
- 添加饱和度增强 backdrop-saturate-[180%]
- 使用多层阴影：外层深度 + inset 顶部高光 + 边缘光晕
- 添加内发光渐变 background-image: linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)
- 边框使用 border-white/20，hover 时提升到 border-white/40
- 圆角使用 rounded-2xl 或 rounded-3xl
- 过渡使用 duration-500 + cubic-bezier(0.16,1,0.3,1) spring easing
- hover 时轻微上浮 -translate-y-0.5 并增强阴影
- 使用丰富的渐变背景作为底层

### Don't
- 禁止在纯色背景上使用（必须有渐变或图片背景）
- 禁止使用低模糊值 backdrop-blur-sm 或 backdrop-blur
- 禁止省略 backdrop-saturate（饱和度增强是 Liquid Glass 的关键）
- 禁止使用不透明背景 bg-white, bg-black
- 禁止使用快速过渡 duration-100, duration-150
- 禁止使用单层扁平阴影（必须多层）
- 禁止使用频闪或高频循环发光动画

### AI-Specific Rules
你是一个 Liquid Glass 设计风格的前端开发专家。生成的所有代码必须严格遵守以下约束：

## 绝对禁止

- 禁止在纯色背景上使用（必须有渐变或图片背景）
- 禁止使用低模糊值 backdrop-blur-sm 或 backdrop-blur
- 禁止省略 backdrop-saturate（饱和度增强是 Liquid Glass 的关键）
- 禁止使用不透明背景 bg-white, bg-black
- 禁止使用快速过渡 duration-100, duration-150
- 禁止使用单层扁平阴影（必须多层）
- 禁止使用频闪或高频循环发光动画

## 必须遵守

- 使用高模糊值 backdrop-blur-[40px] 或 backdrop-blur-[60px]
- 添加饱和度增强 backdrop-saturate-[180%]
- 使用多层阴影：外层深度 + inset 顶部高光 + 边缘光晕
- 添加内发光渐变 background-image: linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)
- 边框使用 border-white/20，hover 时提升到 border-white/40
- 圆角使用 rounded-2xl 或 rounded-3xl
- 过渡使用 duration-500 + cubic-bezier(0.16,1,0.3,1) spring easing
- hover 时轻微上浮 -translate-y-0.5 并增强阴影
- 使用丰富的渐变背景作为底层

## 配色

渐变背景推荐：
- 靛紫粉: from-indigo-600 via-purple-600 to-pink-500
- 蓝紫: from-blue-500 via-purple-500 to-pink-500
- 青蓝: from-cyan-400 via-blue-500 to-indigo-600

玻璃元素：
- 背景: bg-white/10 到 bg-white/20
- 边框: border-white/20 到 border-white/40
- 文字: text-white, text-white/85, text-white/50

## 自检

每次生成代码后检查：
1. 有渐变或图片背景
2. 有 backdrop-blur-[40px] 或更高
3. 有 backdrop-saturate-[180%]
4. 有多层阴影（外层 + inset）
5. 有内发光渐变叠加层
6. 过渡使用 spring easing
7. 文字可读性良好

## Colors
- Primary: rgba(255, 255, 255, 0.15)
- Secondary: rgba(255, 255, 255, 0.10)
- Accent 1: #667eea
- Accent 2: #764ba2
- Accent 3: #f093fb
- Accent 4: #f5576c

## Design Tokens
- Font (heading): font-semibold text-white
- Font (body): text-white/85
- Border radius: rounded-3xl
- Border width: border
- Border color: border-white/20
- Shadow (sm): shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.25)]
- Shadow (md): shadow-[0_8px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.3)]
- Shadow (lg): shadow-[0_16px_48px_rgba(0,0,0,0.16),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.35)]
- Shadow (hover): hover:shadow-[0_20px_60px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]
- Spacing (section): py-16 md:py-24
- Spacing (container): px-6 md:px-8
- Spacing (card): p-6 md:p-8
- Transition: transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]

## Forbidden Classes
- `rounded-none`: Liquid Glass requires large rounded corners (rounded-2xl or rounded-3xl)
- `rounded-sm`: Liquid Glass requires large rounded corners (rounded-2xl or rounded-3xl)
- `rounded`: Liquid Glass requires large rounded corners (rounded-2xl or rounded-3xl)
- `bg-white`: Liquid Glass uses semi-transparent backgrounds (bg-white/10 to bg-white/25)
- `bg-black`: Liquid Glass requires semi-transparent backgrounds, not opaque colors
- `bg-gray-100`
- `bg-gray-900`
- `shadow-none`
- `backdrop-blur-sm`: Liquid Glass requires high blur (backdrop-blur-[40px] or higher)
- `backdrop-blur`: Liquid Glass requires high blur (backdrop-blur-[40px] or higher)
- `duration-100`: Liquid Glass uses fluid animations (duration-500 with spring easing)
- `duration-150`: Liquid Glass uses fluid animations (duration-500 with spring easing)
- `border-black`: Liquid Glass uses luminous white borders (border-white/20 to border-white/40)
- `border-gray-500`

## Component Recipes
### Button
- ID: button
- Base classes: `font-medium backdrop-blur-2xl backdrop-saturate-150 rounded-2xl border border-white/40 ring-1 ring-inset ring-white/20 transition-all duration-300 ease-out`
- Variants:
  - Primary: `bg-white/25 text-white shadow-lg shadow-black/5`
  - Secondary: `bg-white/15 text-white shadow-md shadow-black/5`
  - Accent: `bg-[#007AFF]/30 text-white shadow-lg shadow-[#007AFF]/20`
  - Outline: `bg-transparent text-white border-white/50 ring-white/30`
- Hover: `hover:bg-white/35 hover:ring-white/30 hover:shadow-xl hover:shadow-black/10`

### Card
- ID: card
- Base classes: `bg-white/20 backdrop-blur-3xl backdrop-saturate-150 rounded-3xl border border-white/30 ring-1 ring-inset ring-white/25 shadow-xl shadow-black/10 [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.15),transparent)] transition-all duration-300 ease-out`
- Variants:
  - Default: ``
  - Light: `bg-white/30 ring-white/30`
  - Dark: `bg-black/20 border-white/20 ring-white/15`
  - Accent: `bg-[#007AFF]/20 border-[#007AFF]/30 ring-[#007AFF]/20`
- Hover: `hover:bg-white/25 hover:ring-white/35 hover:shadow-2xl hover:shadow-black/15`

### Input
- ID: input
- Base classes: `w-full bg-white/15 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl border border-white/30 ring-1 ring-inset ring-white/20 text-white placeholder:text-white/50 focus:outline-none transition-all duration-300 ease-out`
- Variants:
  - Default: ``
  - Filled: `bg-white/25`

### Modal
- ID: modal
- Base classes: `bg-white/20 backdrop-blur-3xl backdrop-saturate-150 rounded-3xl border border-white/30 ring-1 ring-inset ring-white/25 shadow-2xl shadow-black/20 [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.15),transparent)]`
- Variants:
  - Default: ``

### Pill Badge
- ID: pill
- Base classes: `inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xl backdrop-saturate-150 rounded-full border border-white/30 ring-1 ring-inset ring-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] text-white`
- Variants:
  - Default: ``
  - Success: `bg-[#34C759]/25 border-[#34C759]/40`
  - Warning: `bg-[#FF9500]/25 border-[#FF9500]/40`
  - Error: `bg-[#FF2D55]/25 border-[#FF2D55]/40`

### Toggle Switch
- ID: toggle
- Base classes: `relative w-12 h-7 bg-white/20 backdrop-blur-xl backdrop-saturate-150 rounded-full border border-white/30 ring-1 ring-inset ring-white/15 transition-all duration-300 ease-out`
- Variants:
  - Default: ``

### Navigation
- ID: nav
- Base classes: `bg-white/10 backdrop-blur-3xl backdrop-saturate-150 border-b border-white/20 shadow-[0_1px_0_0_rgba(255,255,255,0.1)] px-4 md:px-8 py-3 md:py-4`
- Variants:
  - Default: ``
  - Solid: `bg-white/20`

### Slider
- ID: slider
- Base classes: `relative h-2 bg-white/15 backdrop-blur-xl rounded-full ring-1 ring-inset ring-white/20`
- Variants:
  - Default: ``
  - Accent: `[&>.fill]:bg-[#007AFF]/60`

### Control Grid
- ID: controlGrid
- Base classes: `grid grid-cols-2 gap-3 p-4 bg-white/15 backdrop-blur-3xl backdrop-saturate-150 rounded-3xl border border-white/20 ring-1 ring-inset ring-white/15`
- Variants:
  - Default: ``

### Control Tile
- ID: controlTile
- Base classes: `flex flex-col items-center justify-center aspect-square bg-white/20 backdrop-blur-xl backdrop-saturate-150 rounded-2xl border border-white/25 ring-1 ring-inset ring-white/20 text-white transition-all duration-300 ease-out`
- Variants:
  - Default: ``
  - Active: `bg-[#007AFF]/40 border-[#007AFF]/50 ring-[#007AFF]/30 shadow-[0_0_16px_rgba(0,122,255,0.4)]`
- Hover: `hover:bg-white/30 hover:ring-white/30`


---
Generated by StyleKit · https://stylekit.dev
Style: Liquid Glass (Liquid Glass)