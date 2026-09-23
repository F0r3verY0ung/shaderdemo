#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;


float random(vec2 st)
{
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 插值噪声
float noise(vec2 st)
{
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// FBM 分形布朗运动
float fbm(vec2 st)
{
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++)
    {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main()
{
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;

    // 噪声随时间流动
    st += u_time * 0.12;
    float n = fbm(st);

    vec3 col = vec3(n);
    // 加上彩色调色
    col = mix(vec3(0.02,0.05,0.12), vec3(0.1,0.7,0.8), n);

    gl_FragColor = vec4(col, 1.0);
}
