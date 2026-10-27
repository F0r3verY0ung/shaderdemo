# GLSL 片元着色器 新手语法笔记（基于你的 shaderdemo 18 个文件）

> 这份笔记按**你写过的文件顺序**整理：颜色 → 形状(圆/矩形/多边形) → 变换(平移/缩放/旋转) → 波纹/域扭曲 → 噪声。
> 每一节都配了你自己的代码片段，方便对照。全部运行环境是 **glslViewer**。

---

## 0. 固定骨架：每个 .frag 文件都长这样

你几乎所有文件都包含这四块，先记住它：

```glsl
#ifdef GL_ES
precision mediump float;   // 声明精度（移动端/GPU需要），中等精度够用
#endif

uniform float u_time;      // 时间，glslViewer自动传进来，每秒自增
uniform vec2  u_resolution;// 窗口宽高，如 (800, 600)

void main(){               // 程序入口，GPU对【每个像素】都跑一遍
    // ……在这里写逻辑……
    gl_FragColor = vec4(...);  // 输出这个像素的颜色（RGBA）
}
```

**核心认知**：这段 main 不是跑一次，而是**对屏幕上的每一个像素分别跑一次**。所以 shader 的本质 = 给每个像素算出一个颜色。

---

## 1. 数据类型：你用到过的

| 类型 | 含义 | 例子 |
|---|---|---|
| `float` | 小数 | `1.0`, `0.3` |
| `int` | 整数 | `10`（for循环里用） |
| `vec2` | 2个小数 | `vec2(0.5, 0.5)` 表示坐标(x,y) |
| `vec3` | 3个小数 | `vec3(1.0,0,0)` 表示颜色RGB |
| `vec4` | 4个小数 | `vec4(1.0,1.0,1.0,1.0)` 表示RGBA |
| `mat2` | 2×2矩阵 | 用于缩放/旋转 |
| `const` | 常量 | `const int AMOUNT = 12;` `const float PI=3.14159;` |

### vec 分量访问（超级常用）
```glsl
vec2 coord = vec2(0.3, 0.7);
coord.x        // 0.3  取x分量
coord.y        // 0.7  取y分量
vec3 color;
color.r / color.g / color.b   // RGB三个通道，等价于 .x/.y/.z
```

> ⚠️ GLSL 里写小数必须带小数点：`1.0` 而不是 `1`。整数和小数混算会报错。

---

## 2. 三个最关键的内置 uniform

| 变量 | 类型 | 含义 |
|---|---|---|
| `u_resolution` | vec2 | 窗口宽高 `(800,600)` |
| `u_time` | float | 从启动开始走过的秒数，一直在变 → 做动画全靠它 |
| `u_mouse` | vec2 | 鼠标位置（你的 004/016 有声明，但没用到）|

---

## 3. 坐标：先做"归一化"（新手最该懂的第一步）

**原始像素坐标** `gl_FragCoord.xy` 是从 `(0,0)` 到 `(800,600)` 的大数字，不方便计算。
所以第一步永远是：**除以分辨率，缩放到 [0,1] 区间**，这叫归一化。

### 写法一：左下角原点（最常见，005~019 全在用）
```glsl
vec2 coord = gl_FragCoord.xy / u_resolution;
// coord.x: 0=最左, 1=最右    coord.y: 0=底部, 1=顶部
```

### 写法二：中心原点（旋转/缩放用，012）
```glsl
vec2 coord = gl_FragCoord.xy / u_resolution;
coord -= vec2(0.5);   // 把原点挪到画面中心，中心=(0,0)
// 之后再变回来：coord += vec2(0.5);
```

### 写法三：等比例 + 中心原点（015 分形用，防拉伸变形）
```glsl
vec2 coord = 20.0 * (gl_FragCoord.xy - u_resolution / 2.0) / min(u_resolution.y, u_resolution.x);
// min取宽高较小的那个，保证窗口拉多宽图形都不变形
```

---

## 4. 形状函数套路：step + length / atan

### 圆形（006, 009, 010, 011）
```glsl
float circleshape(vec2 position, float radius){
    return step(radius, length(position - vec2(0.5)));
}
```
- `length(v)`：向量长度 = 到原点的距离
- `step(a,b)`：`b < a` 返回 0，`b >= a` 返回 1（做一个硬边界开关）
- 合起来：距离中心 > radius → 返回1(白)；< radius → 0(黑)，就画出一个圆

### 矩形（007, 012）
```glsl
float rectshape(vec2 position, vec2 scale){
    scale = vec2(0.5) - scale * 0.5;          // 把大小换算成边界
    vec2 shaper = vec2(step(scale.x, position.x), step(scale.y, position.y));
    shaper *= vec2(step(scale.x, 1.0 - position.x), step(scale.y, 1.0 - position.y));
    return shaper.x * shaper.y;               // 四个边界全满足=1
}
```

### 多边形（008）
```glsl
float polygonshape(vec2 position, float radius, float sides){
    position = position * 2.0 - 1.0;                     // 中心化
    float angle = atan(position.x, position.y);         // 极坐标角度
    float slice = PI * 2.0 / sides;                     // 每边夹角
    return step(radius, cos(floor(0.5 + angle / slice) * slice - angle) * length(position));
}
```

> **核心函数 `step`**：你画任何形状几乎都靠它做"在不在里面"的开关。
> `step(edge, x)`：x 小于 edge → 0，否则 → 1。

---

## 5. 变换：平移、缩放、旋转

### 平移（009, 010）
```glsl
vec2 translate = vec2( sin(u_time / 3.0), 0.0 );  // 用时间驱动位置 → 左右来回动
coord += translate * 0.5;                          // 直接把坐标整体加上偏移量
```

### 缩放（011）：用 mat2 对角线矩阵
```glsl
mat2 scale(vec2 s){ return mat2(s.x, 0.0, 0.0, s.y); }
coord = scale(vec2(sin(u_time) + 2.0)) * coord;   // 缩放系数随时间变
```

### 旋转（012）：旋转矩阵（重点！）
```glsl
mat2 rotate(float angle){
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}
// 使用前必须把原点移到中心，转完再移回来，否则会绕着角落转
coord -= vec2(0.5);
coord = rotate(u_time) * coord;
coord += vec2(0.5);
```

> 数学对应：旋转矩阵
> ```
> [cos θ, -sin θ]
> [sin θ,  cos θ]
> ```

---

## 6. 程序化图案两大套路（进阶核心）

### 套路一：三角函数波纹 / 域扭曲（013, 014, 016, 017, 018）
```glsl
// 基础：sin(coord.x * 频率) → 横向条纹
color += sin(coord.x * 50.0 + u_time);

// 进阶：嵌套 sin/cos → 波纹扭曲、波浪线
color += sin(coord.x * 6.0 + cos(u_time + coord.y * 40.0 + sin(coord.x * 10.0 + u_time)));

// 域扭曲：循环迭代，把坐标反复"搅乱"，再算颜色（015）
for (int i = 0; i < AMOUNT; i++){
    len = length(coord);
    coord.x = coord.x - cos(coord.y + sin(len)) + cos(u_time / 9.0);
    coord.y = coord.y + sin(coord.x + cos(len)) + sin(u_time / 12.0);
}
```
> 域扭曲 = **先改坐标，再用改过的坐标取色**，能做出流体、螺旋、云雾。

### 套路二：噪声 / FBM 分形噪声（test.frag 是精华）
```glsl
float random(vec2 st){   // 伪随机：同一坐标永远返回同一个值
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
float noise(vec2 st){    // 插值噪声：随机点之间平滑过渡
    vec2 i = floor(st);  vec2 f = fract(st);
    // 取周围4个随机点 + mix平滑插值……
}
float fbm(vec2 st){      // 分形噪声：多层噪声叠加，更像自然纹理
    for(int i=0;i<6;i++){ value += amplitude * noise(st); st *= 2.0; amplitude *= 0.5; }
    return value;
}
```

---

## 7. 颜色输出的关键规律

```glsl
gl_FragColor = vec4( R, G, B, A );
```
- **RGB = 红绿蓝三通道**，取值范围都是 `[0,1]`
- **R=G=B 时是灰度**（黑白）；三通道数值不同才出彩色（参考你的 004/016 加 coord.x 变彩色的实验）

### 把 [-1,1] 映射到 [0,1]（新手必学，防过曝/变黑）
```glsl
// sin/cos 输出范围是 [-1,1]，直接当颜色会截断成黑或纯白
color += sin(x) * 0.5 + 0.5;   // 标准映射公式
```

---

## 8. 常用内置函数速查（你全用到了）

| 函数 | 作用 |
|---|---|
| `sin(x)` / `cos(x)` | 正弦/余弦，输出 [-1,1]，做波纹、动画 |
| `atan(y,x)` | 极坐标角度，做多边形/螺旋 |
| `length(v)` | 向量长度，画圆/求距离 |
| `step(a,b)` | 开关，画形状边界 |
| `floor(x)` | 向下取整，做格子/扫描线(019) |
| `fract(x)` | 取小数部分 |
| `mix(a,b,t)` | 在 a、b 间线性插值，做颜色渐变 |
| `min(a,b)` / `max` | 取小/大，防拉伸 |
| `dot(a,b)` | 点积，噪声、光照 |
| `abs(x)` | 绝对值 |

---

## 9. 你的学习进度 → 下一步建议

你已经走完：**形状(step) → 变换(矩阵) → 动画(u_time) → 图案(域扭曲/噪声)**，这是入门 GLSL 的完整主链。

接下来如果想深入（按你目标游戏客户端/TA方向）：
1. 学 **PBR 光照模型**（漫反射/高光/金属度/粗糙度）
2. 学 **3D 光线步进 raymarching**（SDF）
3. 把一套 shader 移植到 **UE5 / Unity 材质**里跑
4. 学 **渲染管线**：顶点着色器 ↔ 片元着色器怎么配合

---

*笔记整理时间：2026-09-23*
