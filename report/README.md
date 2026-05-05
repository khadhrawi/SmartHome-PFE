# SmartHome PFE Report (LaTeX)

This folder contains a full detailed PFE report source in LaTeX.

## Structure

- `main.tex`: entry point.
- `chapters/`: full chapter set and appendices.
- `references.bib`: bibliography database.

## Compile (PDF)

Use one of the following methods.

### Option 1: latexmk

```bash
cd report
latexmk -pdf -interaction=nonstopmode main.tex
```

### Option 2: pdflatex + bibtex

```bash
cd report
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

## Notes

- The report is intentionally extensive and can be customized with your personal names, institution names, and additional screenshots.
- UML diagrams are included as TikZ figures and as PlantUML source blocks in appendices.
