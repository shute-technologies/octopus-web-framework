import { IOFRenderArgs } from './iofRenderArgs';
import { mat4 } from 'gl-matrix';

export interface IOFMoreRenderArgs extends IOFRenderArgs {
  hasCustomCamera?: boolean;
  cameraMVP?: mat4;
}
