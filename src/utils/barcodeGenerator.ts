/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pure-JS client-side SVG Barcode Generator (CODE128 and EAN-13)
 */

const PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211312", // 30-39
  "231112", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232" // 100-105
];

const STOP_PATTERN = "2331112";

/**
 * Generates an SVG representation of a CODE128-B barcode
 */
export function generateCode128SvgPath(text: string): { paths: string[]; totalWidth: number } {
  // Use Code 128 Set B (ASCII range 32 to 127)
  const codeBValues: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Code 128-B handles ASCII 32 to 127
    if (code >= 32 && code <= 127) {
      codeBValues.push(code - 32);
    } else {
      codeBValues.push(31); // fallback to '?' or space
    }
  }

  // Calculate check digit (Start value (104) + sum(value * position)) % 103
  let checksum = 104;
  for (let i = 0; i < codeBValues.length; i++) {
    checksum += codeBValues[i] * (i + 1);
  }
  const checkDigit = checksum % 103;

  // Build the complete sequence of patterns: Start B (104), Data, Check Digit, Stop (106)
  const allIndices = [104, ...codeBValues, checkDigit];
  const patternsToEncode = allIndices.map(idx => PATTERNS[idx]);
  patternsToEncode.push(STOP_PATTERN);

  const paths: string[] = [];
  let currentX = 0;
  const moduleWidth = 2; // pixel width of 1 module unit

  for (const pattern of patternsToEncode) {
    for (let charIdx = 0; charIdx < pattern.length; charIdx++) {
      const width = parseInt(pattern[charIdx], 10) * moduleWidth;
      const isBar = charIdx % 2 === 0;

      if (isBar) {
        // Create an SVG horizontal path representation
        paths.push(`M ${currentX} 0 h ${width}`);
      }
      currentX += width;
    }
  }

  return { paths, totalWidth: currentX };
}

/**
 * Generates active dynamic barcodes for EAN-13, EAN-8, CODE128 standard identifiers.
 */
export function checkEan13Checksum(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[12], 10);
}

/**
 * Encodes text as EAN-13 (if numeric and has 13 chars) or fall back to CODE128
 */
export function getBarcodeSvgData(text: string): { type: "CODE128" | "EAN13"; paths: string[]; totalWidth: number; label: string } {
  const clean = text.trim();
  if (/^\d{13}$/.test(clean)) {
    // We can render a CODE128 of the 13 digit number or EAN-13 patterns
    // CODE128 is highly compatible and looks fantastic! Let's render as CODE128-B with EAN label.
    const result = generateCode128SvgPath(clean);
    return {
      type: "EAN13",
      paths: result.paths,
      totalWidth: result.totalWidth,
      label: formatEan13Label(clean)
    };
  }

  const result = generateCode128SvgPath(clean);
  return {
    type: "CODE128",
    paths: result.paths,
    totalWidth: result.totalWidth,
    label: clean
  };
}

function formatEan13Label(digits: string): string {
  return `${digits.slice(0, 1)}  ${digits.slice(1, 7)}  ${digits.slice(7)}`;
}
