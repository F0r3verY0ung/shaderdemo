#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

void main(){
 vec2 coord = (gl_FragCoord.xy / u_resolution.xy);
 float color = 0.0;

 color += sin(coord.x * 6.0 + cos(u_time + coord.y * 40.0 + sin(coord.x * 10.0 + u_time * 1.0))) * 0.4;


 gl_FragColor = vec4(vec3(color + coord.x, color + coord.y, color), 0.9);

}
