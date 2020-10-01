export class IOFDefaultShaderSource {
  vertex: string;
  fragment: string;
}

export class OFDefaultShaderSources {

  static readonly SourcesShaderPrimitive = {
    vertex: 
        "attribute vec3 aVertexPosition;\n\n" +

        "uniform mat4 uWVPMatrix : Camera;\n\n" +

        "varying mediump vec4 varyingColor;\n\n" +
  
        "void main(void) {\n" +
            "    gl_Position = uWVPMatrix * vec4(aVertexPosition, 1.0);\n" +
        "}",

    fragment:
        "uniform lowp vec4 uColor : Color;\n\n" +

        "void main(void) {\n" +
        "    gl_FragColor = uColor;\n" +
        "}"
  } as IOFDefaultShaderSource;

  static readonly SourcesShaderTexture = {
    vertex:
        "attribute vec3 aVertexPosition;\n" +
        "attribute vec2 aTextureCoord;\n\n" +

        "uniform mat4 uWVPMatrix : Camera;\n\n" +

        "varying highp vec2 varyingTextureCoord;\n\n" +

        "void main(void) {\n" +
            "    varyingTextureCoord = aTextureCoord;\n" +
            "    gl_Position = uWVPMatrix * vec4(aVertexPosition, 1.0);\n" +
        "}",

    fragment:
        "varying highp vec2 varyingTextureCoord;\n\n" +

        "uniform lowp vec4 uColor : Color;\n" +
        "uniform sampler2D uSamplerTexture : Texture;\n\n" +

        "void main(void) {\n" +
        "    gl_FragColor = texture2D(uSamplerTexture, varyingTextureCoord) * uColor;\n" +
        "}"
  } as IOFDefaultShaderSource;

  static readonly SourcesSpineShaderTexture = {
    vertex:
        "attribute vec2 aVertexPosition;\n" +
        "attribute vec4 aVertexColor;\n" +
        "attribute vec2 aTextureCoord;\n\n" +

        "uniform mat4 uWVPMatrix : Camera;\n\n" +

        "varying lowp vec4 varyingVertexColor;\n" +
        "varying highp vec2 varyingTextureCoord;\n\n" +

        "void main(void) {\n" +
            "    varyingVertexColor = aVertexColor;\n" +
            "    varyingTextureCoord = aTextureCoord;\n" +
            "    gl_Position = uWVPMatrix * vec4(aVertexPosition, 0.0, 1.0);\n" +
        "}",

    fragment:
        "varying lowp vec4 varyingVertexColor;\n" +
        "varying highp vec2 varyingTextureCoord;\n\n" +

        "uniform sampler2D uSamplerTexture : Texture;\n\n" +

        "void main(void) {\n" +
        "    gl_FragColor = texture2D(uSamplerTexture, varyingTextureCoord) * varyingVertexColor;\n" +
        "}"
  } as IOFDefaultShaderSource;

  static readonly  SourcesTextShaderTexture = {
    vertex:
        "attribute vec2 aVertexPosition;\n" +
        "attribute vec4 aVertexColor;\n" +
        "attribute vec2 aTextureCoord;\n\n" +

        "uniform mat4 uWVPMatrix : Camera;\n\n" +

        "varying lowp vec4 varyingVertexColor;\n" +
        "varying highp vec2 varyingTextureCoord;\n\n" +

        "void main(void) {\n" +
            "    varyingVertexColor = aVertexColor;\n" +
            "    varyingTextureCoord = aTextureCoord;\n" +
            "    gl_Position = uWVPMatrix * vec4(aVertexPosition, 0.0, 1.0);\n" +
        "}",

    fragment:
        "varying lowp vec4 varyingVertexColor;\n" +
        "varying highp vec2 varyingTextureCoord;\n\n" +

        "uniform lowp vec4 uTintColor : Color;\n" +
        "uniform sampler2D uSamplerTexture : Texture;\n\n" +

        "void main(void) {\n" +
        "    gl_FragColor = texture2D(uSamplerTexture, varyingTextureCoord) * varyingVertexColor * uTintColor;\n" +
        "}"
  } as IOFDefaultShaderSource;
}