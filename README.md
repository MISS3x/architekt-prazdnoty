# Architekt prázdnoty (RUDA-50)

Jednostránkový tmavý cyberpunkový web s interaktivním audio-příběhem, karaoke efektem pro odstavce a slova a dynamickým černobílým video pozadím.

Tento projekt byl vytvořen k 50. narozeninám Rudolfa Müllera.

## 🚀 Vlastnosti

- **Karaoke zvýrazňování:** Text se zvýrazňuje a posouvá v reálném čase podle přehrávaného vyprávění. Slova, která vypravěč právě čte, svítí jasně bíle s cyan neonovým glow efektem.
- **Temné černobílé video pozadí:** Na pozadí webu a v hero sekci se plynule prolínají (cross-fade) atmosférické, umělecké videosekvence upravené do černobílého a ztmaveného tónu.
- **Ilustrace v textu:** Příběh doprovázejí kruhové ilustrace a na konci také fotografie samotné záhadné lahve „Honey Superfuel Cell“ s jantarově žhnoucími okraji.
- **Kalibrační režim:** Tlačítko „Synchronizace textu“ umožňuje zapnout režim kalibrace, ve kterém můžete klikáním na jednotlivé odstavce přesně doladit časové značky (`cues`) a vyexportovat je jako JSON.
- **Responzivní HUD přehrávač:** Mobile-friendly rozhraní s podporou ošetření poškozených nebo streamovaných audio metadat (`Infinity` délka audia).

## 🛠 Použité technologie

- Čisté **HTML5 / CSS3 / Vanilla Javascript** (bez frameworků a těžkých knihoven).
- **Google Fonts:** Chakra Petch (nadpisy), JetBrains Mono (kódové a HUD prvky), Newsreader (tělo textu).

## 💻 Spuštění

Pro lokální spuštění stačí otevřít soubor `index.html` v libovolném moderním webovém prohlížeči, nebo jej spustit přes lokální server:

```bash
# Příklad spuštění přes http-server
npx http-server -p 8080
```
