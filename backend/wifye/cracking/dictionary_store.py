import atexit
import os
import shutil
import tempfile


class DictionaryStore:
    """Owns the temp directory for uploaded/generated wordlists and crack artifacts."""

    def __init__(self, base_dir=None, cleanup_on_exit=True):
        self._dir = base_dir or tempfile.mkdtemp(prefix='wifye_dicts_')
        self._saved_wordlist = None
        if cleanup_on_exit:
            atexit.register(shutil.rmtree, self._dir, ignore_errors=True)

    @property
    def dir(self):
        return self._dir

    def save_upload(self, file_storage):
        dst = os.path.join(self._dir, file_storage.filename or 'custom.txt')
        file_storage.save(dst)
        return dst

    def path_for(self, filename):
        return os.path.join(self._dir, filename)

    def set_saved_wordlist(self, path):
        self._saved_wordlist = path

    def get_saved_wordlist(self):
        return self._saved_wordlist
