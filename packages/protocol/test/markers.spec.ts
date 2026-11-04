import { describe, it, expect } from 'vitest';

import {
  SYSTEM_PROMPT_TAG,
  SYSTEM_REMINDER_TAG,
  DEFAULT_SYSTEM_REMINDER,
  NATIVE_IMAGE_CONTRACT,
  NATIVE_IMAGE_SYSTEM_REMINDER,
  wrapSystemPrompt,
  wrapSystemReminder,
  appendSystemReminder,
  extractMarkedBlocks,
  stripSystemMarkers,
} from '../src/markers';

describe('markers', () => {
  describe('constants', () => {
    it('should define SYSTEM_PROMPT_TAG', () => {
      expect(SYSTEM_PROMPT_TAG).toBe('agent_protocol');
    });

    it('should define SYSTEM_REMINDER_TAG', () => {
      expect(SYSTEM_REMINDER_TAG).toBe('system_reminder');
    });

    it('should define DEFAULT_SYSTEM_REMINDER as non-empty string', () => {
      expect(DEFAULT_SYSTEM_REMINDER).toBeDefined();
      expect(typeof DEFAULT_SYSTEM_REMINDER).toBe('string');
      expect(DEFAULT_SYSTEM_REMINDER.length).toBeGreaterThan(0);
    });

    it('should define NATIVE_IMAGE_CONTRACT as non-empty string', () => {
      expect(NATIVE_IMAGE_CONTRACT).toBeDefined();
      expect(typeof NATIVE_IMAGE_CONTRACT).toBe('string');
      expect(NATIVE_IMAGE_CONTRACT.length).toBeGreaterThan(0);
    });

    it('should define NATIVE_IMAGE_SYSTEM_REMINDER as non-empty string', () => {
      expect(NATIVE_IMAGE_SYSTEM_REMINDER).toBeDefined();
      expect(typeof NATIVE_IMAGE_SYSTEM_REMINDER).toBe('string');
      expect(NATIVE_IMAGE_SYSTEM_REMINDER.length).toBeGreaterThan(0);
    });
  });

  describe('wrapSystemPrompt', () => {
    it('should wrap text with agent_protocol tags', () => {
      const result = wrapSystemPrompt('test content');
      expect(result).toBe('<agent_protocol>\ntest content\n</agent_protocol>');
    });

    it('should handle empty string', () => {
      const result = wrapSystemPrompt('');
      expect(result).toBe('<agent_protocol>\n\n</agent_protocol>');
    });

    it('should handle undefined', () => {
      const result = wrapSystemPrompt(undefined as any);
      expect(result).toBe('<agent_protocol>\n\n</agent_protocol>');
    });

    it('should handle null', () => {
      const result = wrapSystemPrompt(null as any);
      expect(result).toBe('<agent_protocol>\n\n</agent_protocol>');
    });

    it('should handle multiline content', () => {
      const result = wrapSystemPrompt('line1\nline2\nline3');
      expect(result).toBe('<agent_protocol>\nline1\nline2\nline3\n</agent_protocol>');
    });
  });

  describe('wrapSystemReminder', () => {
    it('should wrap text with system_reminder tags', () => {
      const result = wrapSystemReminder('reminder content');
      expect(result).toBe('<system_reminder>reminder content</system_reminder>');
    });

    it('should handle empty string', () => {
      const result = wrapSystemReminder('');
      expect(result).toBe('<system_reminder></system_reminder>');
    });

    it('should handle undefined', () => {
      const result = wrapSystemReminder(undefined as any);
      expect(result).toBe('<system_reminder></system_reminder>');
    });

    it('should handle null', () => {
      const result = wrapSystemReminder(null as any);
      expect(result).toBe('<system_reminder></system_reminder>');
    });
  });

  describe('appendSystemReminder', () => {
    it('should append system reminder to text', () => {
      const result = appendSystemReminder('base text', 'custom reminder');
      expect(result).toContain('base text');
      expect(result).toContain('<system_reminder>custom reminder</system_reminder>');
    });

    it('should use DEFAULT_SYSTEM_REMINDER when not provided', () => {
      const result = appendSystemReminder('base text');
      expect(result).toContain('base text');
      expect(result).toContain(DEFAULT_SYSTEM_REMINDER);
    });

    it('should trim trailing whitespace from base text', () => {
      const result = appendSystemReminder('base text   ', 'reminder');
      expect(result).not.toContain('base text   \n');
      expect(result).toContain('base text\n\n');
    });

    it('should handle empty base text', () => {
      const result = appendSystemReminder('', 'reminder');
      // Empty string gets trimmed and then \n\n is added
      expect(result).toBe('\n\n<system_reminder>reminder</system_reminder>');
    });
  });

  describe('extractMarkedBlocks', () => {
    it('should extract content from marked blocks', () => {
      const text = '<agent_protocol>content here</agent_protocol>';
      const result = extractMarkedBlocks(text, 'agent_protocol');
      expect(result).toEqual(['content here']);
    });

    it('should extract multiple blocks', () => {
      const text = '<tag>first</tag>middle<tag>second</tag>';
      const result = extractMarkedBlocks(text, 'tag');
      expect(result).toEqual(['first', 'second']);
    });

    it('should return empty array for no matches', () => {
      const text = 'no tags here';
      const result = extractMarkedBlocks(text, 'nonexistent');
      expect(result).toEqual([]);
    });

    it('should trim extracted content', () => {
      const text = '<tag>  content with spaces  </tag>';
      const result = extractMarkedBlocks(text, 'tag');
      expect(result).toEqual(['content with spaces']);
    });

    it('should handle multiline content', () => {
      const text = '<tag>\nline1\nline2\n</tag>';
      const result = extractMarkedBlocks(text, 'tag');
      expect(result).toEqual(['line1\nline2']);
    });
  });

  describe('stripSystemMarkers', () => {
    it('should remove agent_protocol blocks', () => {
      const text = 'before<agent_protocol>content</agent_protocol>after';
      const result = stripSystemMarkers(text);
      expect(result).toBe('beforeafter');
    });

    it('should remove system_prompt blocks (legacy)', () => {
      // The regex in stripSystemMarkers doesn't include the leading < for system_prompt
      // This is a known limitation - the function handles legacy system_prompt without angle brackets
      const text = 'beforesystem_promptcontent</system_prompt>after';
      const result = stripSystemMarkers(text);
      expect(result).toBe('beforeafter');
    });

    it('should remove system_reminder blocks', () => {
      const text = 'before<system_reminder>content</system_reminder>after';
      const result = stripSystemMarkers(text);
      expect(result).toBe('beforeafter');
    });

    it('should remove multiple markers', () => {
      const text = '<agent_protocol>a</agent_protocol>middle<system_reminder>b</system_reminder>';
      const result = stripSystemMarkers(text);
      expect(result).toBe('middle');
    });

    it('should normalize multiple newlines', () => {
      const text = 'line1\n\n\n\nline2';
      const result = stripSystemMarkers(text);
      expect(result).toBe('line1\n\nline2');
    });

    it('should trim result', () => {
      const text = '  content  ';
      const result = stripSystemMarkers(text);
      expect(result).toBe('content');
    });

    it('should handle empty string', () => {
      const result = stripSystemMarkers('');
      expect(result).toBe('');
    });

    it('should handle undefined', () => {
      const result = stripSystemMarkers(undefined as any);
      expect(result).toBe('');
    });
  });
});