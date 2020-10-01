import { OFVector3 } from "./ofVector3";
import { OFVector2 } from "./ofVector2";

export class OFMath {

  static random (min: number, max: number): number {
    return min + ((max * Math.random()) - min);
  }

  static float2Int (value: number): number {
    return value | 0;
  }

  static quadraticBezier (p0: OFVector3, p1: OFVector3, control: OFVector3, time: number) {
    const result = OFVector3.zero();
    
    // Calculate point that results form quadratic Bezier expression
    result.x = (1 - time) * (1 - time) * p0.x + (2 - 2 * time) * time * control.x + p1.x * time * time;
    result.y = (1 - time) * (1 - time) * p0.y + (2 - 2 * time) * time * control.y + p1.y * time * time;
    result.z = (1 - time) * (1 - time) * p0.z + (2 - 2 * time) * time * control.z + p1.z * time * time;
    
    return result;
  }

  static lerp (value1: number, value2: number, time: number): number {
    return value1 + (value2 - value1) * time;
  }

  static toDegrees (radians: number): number {
    return radians * 57.295779513082320876798154814105;
  }

  static toRadians (degrees: number): number {
    return degrees * 0.017453292519943295769236907684886;
  }

  static isPowerOfTwo (value: number): boolean {
    return (value > 0) && ((value & (value - 1)) === 0);
  }

  static lowPrecisionCos (angle: number): number {
    let cosValue = 0;
    
    if (angle < -3.14159265) { angle += 6.28318531; }
    else { if (angle > 3.14159265) { angle -= 6.28318531; } }
    angle += 1.57079632;
    if (angle < 0) { cosValue = 1.27323954 * angle + 0.405284735 * angle * angle; }
    else { cosValue = 1.27323954 * angle - 0.405284735 * angle * angle; }
    
    return cosValue;
  }

  static lowPrecisionSin (angle: number): number {
    let sinValue = 0;
      
    if (angle < -3.14159265) { angle += 6.28318531; }
    else { if (angle > 3.14159265) { angle -= 6.28318531; } }
    angle += 3.14159265;
    if (angle > 3.14159265) { angle -= 6.28318531; }
    if (angle < 0) { sinValue = 1.27323954 * angle + 0.405284735 * angle * angle; }
    else { sinValue = 1.27323954 * angle - 0.405284735 * angle * angle; }
    
    return sinValue;
  }

  static lowPrecision_Atan2 (y: number, x: number): number {
    const coeff_1 = Math.PI / 4.0;
    const coeff_2 = 3 * coeff_1;
    const abs_y = Math.abs(y);
    let angle;
    
    if (x >= 0.0) {
      const r = (x - abs_y) / (x + abs_y);
      angle = coeff_1 - coeff_1 * r;
    }
    else {
      const r = (x + abs_y) / (abs_y - x);
      angle = coeff_2 - coeff_1 * r;
    }
    
    return y < 0.0 ? -angle : angle;
  }

  static isPointInPolygon (point: OFVector2, polygon: OFVector2[]): boolean {
    var minX = polygon[0].x;
    var maxX = polygon[0].x;
    var minY = polygon[0].y;
    var maxY = polygon[0].y;

    polygon.forEach(p => {
      minX = Math.min(p.x, minX);
      maxX = Math.max(p.x, maxX);
      minY = Math.min(p.y, minY);
      maxY = Math.max(p.x, maxY);
    });

    if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) {
      return false;
    }

    let pointInsidePolygon = false;

    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if ((polygon[i].y > point.y) != (polygon[j].y > point.y) && point.x < 
          (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / 
          (polygon[j].y - polygon[i].y) + polygon[i].x) {

        pointInsidePolygon = !pointInsidePolygon;
      }
    }

    return pointInsidePolygon;
  }

  static min (val1: number, val2: number): number {
    return val1 < val2 ? val1 : val2;
  }

  static max (val1: number, val2: number): number {
    return val1 > val2 ? val1 : val2;
  }
}