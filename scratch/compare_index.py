with open('index.html', 'r', encoding='utf-8') as f:
    i1 = f.read()

with open('index_v2.html', 'r', encoding='utf-8') as f:
    i2 = f.read()

print("index.html length:", len(i1))
print("index_v2.html length:", len(i2))
print("Are they identical?", i1 == i2)

# Check if index.html contains "img/comic" paths or "img/screenshots" paths
print("img/comic in index.html:", "img/comic" in i1)
print("img/screenshots in index.html:", "img/screenshots" in i1)
print("img/comic in index_v2.html:", "img/comic" in i2)
print("img/screenshots in index_v2.html:", "img/screenshots" in i2)
