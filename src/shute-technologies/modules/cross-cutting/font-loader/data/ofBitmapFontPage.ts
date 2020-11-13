import { OFBitmapFontCharDescriptor } from "./ofBitmapFontCharDescriptor";

export class OFBitmapFontPage {
  id = 0;
  charCount = 0;
  charArraySize = 0;
	path = '';
	isInitialized = false;
	chars: OFBitmapFontCharDescriptor[] = null;
}