from wifye.cracking.wordlist_finder import WordlistFinder, fmt_size


def test_fmt_size_picks_appropriate_unit():
    assert fmt_size(500) == '500 B'
    assert fmt_size(2048) == '2 KB'
    assert fmt_size(5 * 1024 * 1024) == '5 MB'


def test_find_system_wordlists_scans_injected_dirs(tmp_path):
    (tmp_path / 'common.txt').write_text('password\n123456\n')
    (tmp_path / 'rockyou.txt').write_text('rockyou-content\n')
    (tmp_path / 'empty.txt').write_text('')  # zero-size, should be skipped
    (tmp_path / 'ignored.bin').write_text('binary-ish')  # wrong suffix, skipped

    finder = WordlistFinder(search_dirs=[str(tmp_path)], rockyou_paths=[])
    found = finder.find_system_wordlists()
    names = {f['name'] for f in found}

    assert 'common.txt' in names
    assert 'empty.txt' not in names
    assert 'ignored.bin' not in names
    # rockyou.txt is found via the dedicated rockyou path list, not the generic scan,
    # but it's still skipped from the generic results to avoid duplicates
    assert 'rockyou.txt' not in names


def test_find_rockyou_returns_default_entry_when_present(tmp_path):
    rockyou = tmp_path / 'rockyou.txt'
    rockyou.write_text('password123\n')

    finder = WordlistFinder(search_dirs=[], rockyou_paths=[str(rockyou)])
    result = finder.find_rockyou()

    assert result is not None
    assert result['path'] == str(rockyou)
    assert result['is_default'] is True


def test_find_rockyou_returns_none_when_absent():
    finder = WordlistFinder(search_dirs=[], rockyou_paths=['/nonexistent/rockyou.txt'])
    assert finder.find_rockyou() is None


def test_find_system_wordlists_appends_rockyou_last(tmp_path):
    (tmp_path / 'aaa_first.txt').write_text('x\n')
    rockyou = tmp_path / 'rockyou.txt'
    rockyou.write_text('y\n')

    finder = WordlistFinder(search_dirs=[str(tmp_path)], rockyou_paths=[str(rockyou)])
    found = finder.find_system_wordlists()

    assert found[-1]['is_default'] is True
    assert found[-1]['path'] == str(rockyou)


def test_find_system_wordlists_handles_missing_dirs_gracefully():
    finder = WordlistFinder(search_dirs=['/definitely/does/not/exist'], rockyou_paths=[])
    assert finder.find_system_wordlists() == []
