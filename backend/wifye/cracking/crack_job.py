from dataclasses import dataclass, field


@dataclass
class CrackJob:
    """Holds the mutable state of a single hashcat run."""

    hash_file: str
    pot_file: str
    cmd: str
    status: str = 'running'
    output: list = field(default_factory=list)
    cracked: list = field(default_factory=list)
    stats: dict = field(default_factory=dict)
    done: bool = False
    proc: object = None
    returncode: int = None

    def append_output(self, line):
        self.output.append(line)

    def mark_done(self, status='done'):
        self.status = status
        self.done = True

    def to_status_dict(self, from_line=0):
        return {
            'status': self.status,
            'output': list(self.output[from_line:]),
            'total': len(self.output),
            'done': self.done,
            'cracked': list(self.cracked),
            'stats': dict(self.stats),
        }

    @staticmethod
    def idle_status():
        return {'status': 'idle', 'output': [], 'total': 0, 'done': True, 'cracked': [], 'stats': {}}
