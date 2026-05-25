@echo off
setlocal
set PDFLATEX="C:\Users\SIGMA IT\AppData\Local\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe"
set OPTS=-interaction=nonstopmode -synctex=1

cd /d "%~dp0"

echo [1/3] First pass...
%PDFLATEX% %OPTS% main.tex

echo [2/3] Second pass (TOC + references)...
%PDFLATEX% %OPTS% main.tex

echo [3/3] Third pass (final cross-references)...
%PDFLATEX% %OPTS% main.tex

echo.
echo Done! Open main.pdf to view the result.
pause
