#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
const int AMOUNT = 12;

void main(){
    vec2 coord = 20.0 * (gl_FragCoord.xy - u_resolution / 2.0) / min(u_resolution.y, u_resolution.x);
    float len;
    for (int i = 0; i < AMOUNT; i++){
        len = length(coord);
        coord.x = coord.x - cos(coord.y + sin(len)) + cos(u_time / 9.0);
        coord.y = coord.y + sin(coord.x + cos(len)) + sin(u_time / 12.0);
    }
    // 混合径向len + 平面coord，同时拥有螺旋环+平面流体色彩
    float r = cos(len * 2.0)*0.5 + 0.5;
    float g = (sin(coord.y)*0.5+0.5);
    float b = cos(len * 1.0)*0.5 + 0.5;
    gl_FragColor = vec4(r,g,b,1.0);
}
