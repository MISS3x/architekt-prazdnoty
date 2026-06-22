import difflib

with open('index.html', 'r', encoding='utf-8') as f:
    i1 = f.read().splitlines()

with open('index_v2.html', 'r', encoding='utf-8') as f:
    i2 = f.read().splitlines()

diff = list(difflib.unified_diff(i1, i2, fromfile='index.html', tofile='index_v2.html', n=0))
print("Diff lines count:", len(diff))
for line in diff[:20]:
    print(line)
