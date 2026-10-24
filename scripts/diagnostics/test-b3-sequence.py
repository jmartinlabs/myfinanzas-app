#!/usr/bin/env python3
import runpy
from pathlib import Path
import unittest
assess = runpy.run_path(str(Path(__file__).with_name('b3-sequence.py')))['assess']

class Results(unittest.TestCase):
    def test_selected_pass(self):
        self.assertTrue(assess('(pass) SQLite B3: fixture', 0, ['B3'])['ok'])
    def test_failure_is_never_success(self):
        self.assertFalse(assess('(fail) SQLite B3: fixture', 1, ['B3'])['ok'])
        self.assertFalse(assess('(fail) SQLite B3: fixture', 0, ['B3'])['ok'])
    def test_repeated_failure_summary_keeps_selection_but_fails(self):
        result = assess('(fail) SQLite B3: x\n(fail) SQLite B3: x', 1, ['B3'])
        self.assertTrue(result['selection_valid'])
        self.assertFalse(result['ok'])
    def test_empty_wrong_or_duplicate_selection(self):
        for text in ('', '(pass) SQLite B4: fixture', '(pass) SQLite B3: x\n(pass) SQLite B3: x'):
            self.assertFalse(assess(text, 0, ['B3'])['ok'])
    def test_nonzero_with_pass_output_is_failure(self):
        self.assertFalse(assess('(pass) SQLite B3: fixture', 1, ['B3'])['ok'])
    def test_sequence_must_be_complete_and_ordered(self):
        good = '\n'.join('(pass) SQLite '+n+': fixture' for n in ('B1','B2','B3'))
        self.assertTrue(assess(good, 0, ['B1','B2','B3'])['ok'])
        self.assertFalse(assess(good, 0, ['B3'])['ok'])
        self.assertFalse(assess(good.replace('B2','B4'), 0, ['B1','B2','B3'])['ok'])

if __name__ == '__main__':
    unittest.main()
