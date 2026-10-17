/**
 * sharing.service.js
 *
 * Safe Quiz-Sharing and Code Generation Engine.
 * Generates collision-resistant, human-friendly share codes.
 */

const crypto = require('crypto');

class SharingService {
  /**
   * Generates a collision-resistant, readable share code.
   * e.g., 'QF-8K2N9X' or topic-prefixed 'QF-BIO-7412'
   *
   * @param {string} topic - Optional topic to make code more readable
   * @returns {string}
   */
  static generateShareCode(topic = '') {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous 0, 1, I, O
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }

    if (topic && typeof topic === 'string') {
      const cleanTopic = topic.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      if (cleanTopic.length >= 2) {
        return `QF-${cleanTopic}-${code.slice(0, 4)}`;
      }
    }

    return `QF-${code.slice(0, 3)}-${code.slice(3, 6)}`;
  }

  /**
   * Validate share code format.
   * @param {string} code
   * @returns {boolean}
   */
  static isValidCode(code) {
    if (!code || typeof code !== 'string') return false;
    const clean = code.trim().toUpperCase();
    return /^QF-[A-Z0-9]{2,4}-[A-Z0-9]{3,4}$/.test(clean) || /^QF-[A-Z0-9]{6}$/.test(clean);
  }
}

module.exports = SharingService;
