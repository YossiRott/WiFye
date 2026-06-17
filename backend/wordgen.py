import itertools

LEET_MAP = {
    'a': '@', 'e': '3', 'i': '1', 'o': '0',
    's': '$', 't': '7', 'b': '8', 'g': '9', 'l': '1',
}

NUM_SUFFIXES = [
    '1', '12', '123', '1234', '12345',
    '01', '00', '007', '99', '69',
    '2020', '2021', '2022', '2023', '2024', '2025',
]

SPEC_SUFFIXES = ['!', '@', '#', '$', '!!', '!@#', '123!', '1!']


def _leet(word):
    return ''.join(LEET_MAP.get(c.lower(), c) for c in word)


def generate(seeds, options):
    """
    Generate password candidates from seed words.

    options (dict, all bool):
      capitals  – add Capitalized / UPPER / lower variants
      leet      – add 1337-speak substitutions
      numbers   – append common number sequences / years
      special   – append special character suffixes
      combos    – combine pairs of seed words
      prefixes  – prepend common single-char prefixes
    """
    words = list(dict.fromkeys(w.strip() for w in seeds if w.strip()))
    if not words:
        return []

    # Build base variant pool from seed words
    variants = set()
    for w in words:
        variants.add(w)
        if options.get('capitals'):
            variants.add(w.lower())
            variants.add(w.upper())
            variants.add(w.capitalize())
        if options.get('leet'):
            lw = _leet(w)
            variants.add(lw)
            if options.get('capitals'):
                variants.add(lw.capitalize())
                variants.add(lw.upper())

    result = set(variants)

    # Suffixes
    for v in variants:
        if options.get('numbers'):
            for sfx in NUM_SUFFIXES:
                result.add(v + sfx)
        if options.get('special'):
            for sfx in SPEC_SUFFIXES:
                result.add(v + sfx)
        if options.get('numbers') and options.get('special'):
            for nsfx in NUM_SUFFIXES[:6]:
                for ssfx in SPEC_SUFFIXES[:4]:
                    result.add(v + nsfx + ssfx)

    # Prefixes (single chars)
    if options.get('prefixes'):
        base = set(result)
        for v in base:
            for pfx in ['1', '!', '@', 'the', 'my']:
                result.add(pfx + v)

    # Pair combinations
    if options.get('combos') and len(words) >= 2:
        for w1, w2 in itertools.permutations(words, 2):
            result.add(w1 + w2)
            result.add(w1.capitalize() + w2.capitalize())
            result.add(w1 + '_' + w2)
            result.add(w1 + '.' + w2)
            result.add(w1 + '-' + w2)
            if options.get('numbers'):
                for sfx in ['1', '123', '!']:
                    result.add(w1 + w2 + sfx)

    return sorted(result)
