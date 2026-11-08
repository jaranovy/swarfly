// The one list of the fonts bundled for the Text tool (release 1.21.0). Everything else is built from it:
//  - localFonts (js/basic-cad-text.js) finds the TTF file of a family for opentype.js,
//  - swarflyFontNames feeds the font drop-down (lib/jquery/fontselect),
//  - the @font-face rules are added here, so the drop-down shows every name in its own font.
// To add a font: copy the regular-weight TTF to lib/fonts/, add one line here, mention it in lib/fonts/LICENSE.txt. The font must have the
// Czech letters (check "ěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ"). Pictures: Noto Emoji, Noto Sans Symbols, Noto Sans Symbols 2 (type or paste the symbol).
var SWARFLY_FONTS = [
  ["Abril Fatface", "AbrilFatface-Regular.ttf"], ["Alfa Slab One", "AlfaSlabOne-Regular.ttf"], ["Amatic SC", "AmaticSC-Regular.ttf"],
  ["Anton", "Anton-Regular.ttf"], ["Arvo", "Arvo-Regular.ttf"], ["Audiowide", "Audiowide-Regular.ttf"], ["Bangers", "Bangers-Regular.ttf"],
  ["Barlow", "Barlow-Regular.ttf"], ["Bebas Neue", "BebasNeue-Regular.ttf"], ["Bevan", "Bevan-Regular.ttf"], ["Bitter", "Bitter-Regular.ttf"],
  ["Black Ops One", "BlackOpsOne-Regular.ttf"], ["Bowlby One SC", "BowlbyOneSC-Regular.ttf"], ["Bungee", "Bungee-Regular.ttf"],
  ["Cabin", "Cabin-Regular.ttf"], ["Caveat", "Caveat-Regular.ttf"], ["Cinzel", "Cinzel-Regular.ttf"], ["Comfortaa", "Comfortaa-Regular.ttf"],
  ["Cormorant Garamond", "CormorantGaramond-Regular.ttf"], ["Courgette", "Courgette-Regular.ttf"], ["Dancing Script", "DancingScript.ttf"],
  ["EB Garamond", "EBGaramond-Regular.ttf"], ["Exo 2", "Exo2-Regular.ttf"], ["Fira Sans", "FiraSans-Regular.ttf"], ["Great Vibes", "GreatVibes-Regular.ttf"],
  ["Josefin Sans", "JosefinSans-Regular.ttf"], ["Kalam", "Kalam-Regular.ttf"], ["Kaushan Script", "KaushanScript-Regular.ttf"], ["Lato", "Lato-Regular.ttf"],
  ["Libre Baskerville", "LibreBaskerville-Regular.ttf"], ["Lobster", "Lobster-Regular.ttf"], ["Lora", "Lora-Regular.ttf"],
  ["Merienda", "Merienda-Regular.ttf"], ["Merriweather", "Merriweather-Regular.ttf"], ["Montserrat", "Montserrat-Regular.ttf"],
  ["Noto Emoji", "NotoEmoji-Regular.ttf"], ["Noto Sans Symbols", "NotoSansSymbols-Regular.ttf"], ["Noto Sans Symbols 2", "NotoSansSymbols2-Regular.ttf"],
  ["Nunito", "Nunito-Regular.ttf"], ["Open Sans", "OpenSans-Regular.ttf"], ["Orbitron", "Orbitron.ttf"], ["Oswald", "Oswald.ttf"],
  ["Pacifico", "Pacifico-Regular.ttf"], ["Patrick Hand", "PatrickHand-Regular.ttf"], ["Permanent Marker", "PermanentMarker-Regular.ttf"],
  ["Playfair Display", "PlayfairDisplay.ttf"], ["Poppins", "Poppins-Regular.ttf"], ["Press Start 2P", "PressStart2P-Regular.ttf"],
  ["PT Sans", "PT_Sans-Web-Regular.ttf"], ["PT Serif", "PT_Serif-Web-Regular.ttf"], ["Quicksand", "Quicksand-Regular.ttf"], ["Raleway", "Raleway.ttf"],
  ["Righteous", "Righteous-Regular.ttf"], ["Roboto", "Roboto-Regular.ttf"], ["Roboto Mono", "RobotoMono-Regular.ttf"], ["Roboto Slab", "RobotoSlab-Regular.ttf"],
  ["Rubik", "Rubik-Regular.ttf"], ["Russo One", "RussoOne-Regular.ttf"], ["Saira Stencil One", "SairaStencilOne-Regular.ttf"],
  ["Source Code Pro", "SourceCodePro-Regular.ttf"], ["Source Sans 3", "SourceSans3-Regular.ttf"], ["Special Elite", "SpecialElite-Regular.ttf"],
  ["Staatliches", "Staatliches-Regular.ttf"], ["Titillium Web", "TitilliumWeb-Regular.ttf"], ["Ubuntu", "Ubuntu-Regular.ttf"], ["VT323", "VT323-Regular.ttf"],
  ["Work Sans", "WorkSans-Regular.ttf"], ["Yanone Kaffeesatz", "YanoneKaffeesatz-Regular.ttf"]
];

var swarflyFontNames = SWARFLY_FONTS.map(function(f) { return f[0].replace(/ /g, "+"); });   // the drop-down uses "+" for spaces

if (typeof document !== "undefined") (function() {
  var css = SWARFLY_FONTS.map(function(f) {
    return "@font-face{font-family:'" + f[0] + "';font-style:normal;font-weight:400;font-display:swap;src:url('lib/fonts/" + f[1] + "') format('truetype');}";
  }).join("\n");
  var style = document.createElement("style");
  style.id = "swarflyFontFaces";
  style.textContent = css;
  document.head.appendChild(style);
})();
