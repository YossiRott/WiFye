import json
import os
import subprocess


class ParserError(Exception):
    """Base exception for FrameParser failures."""


class ParserCompileError(ParserError):
    pass


class ParserTimeoutError(ParserError):
    pass


class ParserOutputError(ParserError):
    pass


class FrameParser:
    """Wraps the compiled C 802.11 frame parser binary (parser.c)."""

    def __init__(self, binary_path=None, source_path=None):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self._binary_path = binary_path or os.path.join(backend_dir, 'parser')
        self._source_path = source_path or os.path.join(backend_dir, 'parser.c')

    @property
    def binary_path(self):
        return self._binary_path

    def ensure_compiled(self, timeout=30):
        if os.path.exists(self._binary_path):
            return
        if not os.path.exists(self._source_path):
            raise ParserCompileError('parser.c not found in backend/')
        try:
            result = subprocess.run(
                ['gcc', '-O2', '-o', self._binary_path, self._source_path],
                capture_output=True, text=True, timeout=timeout,
            )
        except FileNotFoundError:
            raise ParserCompileError('gcc not found. Install with: brew install gcc')
        if result.returncode != 0:
            raise ParserCompileError(f'gcc failed: {result.stderr}')

    def parse(self, filepath, timeout=180):
        """Run the parser binary against filepath and return the decoded JSON frame list."""
        self.ensure_compiled()
        try:
            result = subprocess.run(
                [self._binary_path, filepath],
                capture_output=True, text=True, timeout=timeout,
            )
        except subprocess.TimeoutExpired:
            raise ParserTimeoutError('Parsing timed out (file too large?)')
        except OSError as exc:
            raise ParserOutputError(str(exc))

        if result.returncode != 0:
            raise ParserOutputError(f'Parser error: {result.stderr[:300]}')
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            raise ParserOutputError(f'Parser output corrupt: {exc}')
