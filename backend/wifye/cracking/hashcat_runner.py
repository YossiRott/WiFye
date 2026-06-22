import os
import subprocess
import threading

from .hashcat_output_parser import decode_cracked, parse_stats


class HashcatRunner:
    """Builds and runs the hashcat subprocess, streaming output into a CrackJob."""

    @staticmethod
    def build_command(hash_file, wordlist_paths, workload, pot_file):
        return [
            'hashcat', '-m', '22000', hash_file,
            *wordlist_paths,
            '-w', str(workload),
            '-D', '1,2',
            '--potfile-path', pot_file,
            '--status', '--status-timer=4',
            '--force', '-O',
        ]

    @staticmethod
    def run_async(job, cmd):
        def _run():
            try:
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    stdin=subprocess.DEVNULL, text=True, bufsize=1,
                )
                job.proc = proc
                for raw in proc.stdout:
                    line = raw.rstrip()
                    if line:
                        job.append_output(line)
                        job.stats.update(parse_stats(job.output[-20:]))
                proc.wait()
                job.returncode = proc.returncode
                job.stats = parse_stats(job.output)

                try:
                    with open(job.pot_file) as f:
                        for ln in f:
                            ln = ln.strip()
                            if ln:
                                job.cracked.append(decode_cracked(ln))
                except OSError:
                    pass
            except FileNotFoundError:
                job.append_output('ERROR: hashcat not found in PATH')
            except Exception as exc:
                job.append_output(f'ERROR: {exc}')
            finally:
                job.mark_done('done')
                for path in (job.hash_file, job.pot_file):
                    try:
                        os.unlink(path)
                    except OSError:
                        pass

        threading.Thread(target=_run, daemon=True).start()
