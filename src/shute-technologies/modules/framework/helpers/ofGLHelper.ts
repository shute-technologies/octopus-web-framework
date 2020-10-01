import { OFConsole } from "./ofConsole";
import { OFTranslations } from "../settings/ofTranslations";

export interface GLHCompileShaderResult {
  shader: WebGLShader; 
  hasErrors: boolean; 
  errorMessage: string; 
}

export interface GLHLinkShaderProgramResult {
  shaderProgram: WebGLProgram; 
  hasErrors: boolean; 
  errorMessage: string; 
}

export class OFGLHelper {

  static compileShader (graphicContext: WebGLRenderingContext , shaderSource: string, shaderType: number): WebGLShader {
    const _GL = graphicContext;
    let shaderSourceObject: WebGLShader;

    switch (shaderType) {
      case _GL.VERTEX_SHADER:
        shaderSourceObject = _GL.createShader(_GL.VERTEX_SHADER);
        break;
      case _GL.FRAGMENT_SHADER:
        shaderSourceObject = _GL.createShader(_GL.FRAGMENT_SHADER);
        break;
    }

    // Bind the source to a shader object
    _GL.shaderSource(shaderSourceObject, shaderSource);
    // Compile the shader program
    _GL.compileShader(shaderSourceObject);
    // See if it compiled successfully
    if (!_GL.getShaderParameter(shaderSourceObject, _GL.COMPILE_STATUS)) {
      OFConsole.log(OFTranslations.Framework.GLHelper.compileShader, 
        _GL.getShaderInfoLog(shaderSourceObject));
      return null;
    }

    return shaderSourceObject;
  }

  static compileShaderWithResults (graphicContext: WebGLRenderingContext, shaderSource: string, 
    shaderType: number): GLHCompileShaderResult {
    
    const _GL = graphicContext;
    let shaderSourceObject: WebGLShader;
    let errorsMessage: string = null;

    switch (shaderType) {
      case _GL.VERTEX_SHADER:
        shaderSourceObject = _GL.createShader(_GL.VERTEX_SHADER);
        break;
      case _GL.FRAGMENT_SHADER:
        shaderSourceObject = _GL.createShader(_GL.FRAGMENT_SHADER);
        break;
    }

    // Bind the source to a shader object
    _GL.shaderSource(shaderSourceObject, shaderSource);
    // Compile the shader program
    _GL.compileShader(shaderSourceObject);
    
    // See if it compiled successfully
    if (!_GL.getShaderParameter(shaderSourceObject, _GL.COMPILE_STATUS)) {
      errorsMessage = _GL.getShaderInfoLog(shaderSourceObject);
    }

    return { 
      shader: shaderSourceObject, 
      hasErrors: errorsMessage !== null, 
      errorMessage: errorsMessage 
    } as GLHCompileShaderResult;
  }

  static createProgram (graphicContext: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const _GL = graphicContext;
    const shaderProgram: WebGLProgram = _GL.createProgram();

    _GL.attachShader(shaderProgram, vertexShader);
    _GL.attachShader(shaderProgram, fragmentShader);
    _GL.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!_GL.getProgramParameter(shaderProgram, _GL.LINK_STATUS)) {
      OFConsole.log(OFTranslations.Framework.GLHelper.createProgram, 
        _GL.getProgramInfoLog(shaderProgram));
    }

    return shaderProgram;
  }

  static createProgramWithResults (graphicContext: WebGLRenderingContext, vertexShader: WebGLShader, 
    fragmentShader: WebGLShader): GLHLinkShaderProgramResult {
    
    const _GL = graphicContext;
    const shaderProgram: WebGLProgram = _GL.createProgram();
    let errorsMessage: string = null;

    _GL.attachShader(shaderProgram, vertexShader);
    _GL.attachShader(shaderProgram, fragmentShader);
    _GL.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!_GL.getProgramParameter(shaderProgram, _GL.LINK_STATUS)) {
      errorsMessage = _GL.getProgramInfoLog(shaderProgram);
    }

    return { 
      shaderProgram: shaderProgram, 
      hasErrors: errorsMessage !== null, 
      errorMessage: errorsMessage
    } as GLHLinkShaderProgramResult;
  }
}
