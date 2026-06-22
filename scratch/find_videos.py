with open('index_v2.html', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if '<video' in line:
            print(f"{i}: {line.strip()}")
