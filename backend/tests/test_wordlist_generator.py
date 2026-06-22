from wifye.wordgen.wordlist_generator import WordlistGenerator


def test_empty_seeds_yield_no_words():
    assert WordlistGenerator.generate([], {}) == []
    assert WordlistGenerator.generate(['   '], {}) == []


def test_no_options_returns_just_dedup_seeds():
    words = WordlistGenerator.generate(['Summer', 'Summer', ' Winter '], {})
    assert words == sorted({'Summer', 'Winter'})


def test_capitals_option_adds_case_variants():
    words = WordlistGenerator.generate(['Dog'], {'capitals': True})
    assert {'Dog', 'dog', 'DOG'}.issubset(set(words))


def test_leet_option_substitutes_characters():
    words = WordlistGenerator.generate(['cat'], {'leet': True})
    assert 'c@7' in words


def test_numbers_option_appends_suffixes():
    words = WordlistGenerator.generate(['dog'], {'numbers': True})
    assert 'dog123' in words
    assert 'dog2025' in words


def test_special_option_appends_special_chars():
    words = WordlistGenerator.generate(['dog'], {'special': True})
    assert 'dog!' in words
    assert 'dog123!' in words


def test_prefixes_option_prepends_common_prefixes():
    words = WordlistGenerator.generate(['dog'], {'prefixes': True})
    assert 'thedog' in words
    assert '!dog' in words


def test_combos_option_requires_two_or_more_words():
    single = WordlistGenerator.generate(['dog'], {'combos': True})
    assert single == ['dog']

    pair = WordlistGenerator.generate(['dog', 'cat'], {'combos': True})
    assert 'dogcat' in pair
    assert 'DogCat' in pair
    assert 'dog_cat' in pair
    assert 'catdog' in pair  # permutations cover both orders


def test_result_is_sorted_and_deduplicated():
    words = WordlistGenerator.generate(['a', 'a'], {'capitals': True})
    assert words == sorted(set(words))
