(function($) {
  $('head').append($(`<style>td:has(span[name="TagCellEditDataTable"]), span.dtr-data:has(span[name="TagCellEditDataTable"]) {position:relative;} span .dtr-details {width:100%;}.DataTableCellEditable {padding:0px !important;max-width: fit-content;min-width: fit-content;width: 0px;}</style>`));
  $.fn.EditDataTable = function(InitObject) {
    if ([$().DataTable === undefined,!$(this).is('table')].every(e=>e)) return
    let Tabla = this.DataTable(InitObject);
    if (Tabla === undefined) return
    const SAVEHISTORY = InitObject.history ?? false;
    const SAVEONCLOSE = InitObject.saveOnBlur ?? false;
    Tabla.history = SAVEHISTORY ? [] : null;
    let Input = `<input autocomplete="off" name="InputEditCellDataTable" style="background-color:transparent; border: solid 0px;"></input>`;
    let TagEdit = `<span name="TagCellEditDataTable" style="opacity:0.5;align-content:center; position: absolute;right: 0px;background: var(--primary);top: 0px;width: 1rem;height: 1rem;font-size: 0.9rem;border-radius: 0px 0px 0px 3px;color: white;text-align: center;" class="la la-pencil"></span>`;
    // Inicialización de componentes y asignacion de propiedades a las columnas de la tabla
    let TypesInput = {
      "num" : "number",
      "num-fmt" : "number",
      "html-num" : "number",
      "html-num-fmt" : "number",
      "date" : "date",
      "html" : "text",
      "string-utf8" : "text",
      "string" : "text"
    };
 
    let ColumnsEdit = Tabla.settings()[0].aoColumns.filter(column => column.editable === true);
    let ColumnsEditIndx = ColumnsEdit.map(Column => Column.idx);
    let ColumnsTypeData = ColumnsEdit.map(Column => ColumnsEditIndx.includes(Column.idx) ? { idx: Column.idx, type: Column.sType } : undefined);
    let ELemetsNoEditables = `
      button, input, select, textarea, option, label, fieldset, legend, datalist, output,
      a[href], area[href],
      details, summary, dialog,
      audio[controls], video[controls], [contenteditable],
      [role="button"], [role="link"],
      iframe, object, embed
    `;
      
    // $(this).find('tbody').on('click', InsertInputEdit); // No encontre manera (en Jquery) de bloquear el evento click en el TR para evitar que se expanda la fila.
    $(this).find('tbody').get(0).addEventListener('click', InsertInputEdit, true);
    $(this).find('tbody').get(0).addEventListener('keyup', (e) => { 
      CancelEvent(e); ApliChangeCell(e); 
    }, true);
 
    Tabla.on('mouseenter', 'td, span.dtr-data', function (e) {
      if (e.target.matches(ELemetsNoEditables)) return
      $('span[name="TagCellEditDataTable"]').remove();
      let CellInfo = Tabla.cell(GetCellNode(e.target));
      let isColumnEditable = ColumnsEditIndx.includes(CellInfo.column(e.target).index());
      if (CellInfo.length !== 0 && isColumnEditable) {
        let CellNode = GetCellNode(e.target);
        $(CellNode).append(TagEdit);
      }
    }).on('mouseleave', 'td, span.dtr-data', function (e) { $('span[name="TagCellEditDataTable"]').remove(); })
 
    function ApliChangeCell(e) { 
      if (e.key === 'Enter') {
        let Cell = GetCellNode(e.target);
        if (Cell !== undefined) RemoveInput(Cell, true);
      }
    }
    
	function InsertInputEdit(e) {
  		if (e.target.matches(ELemetsNoEditables)) return;
  		let isColumnCero = Tabla.column(GetCellNode(e.target)).index() === 0;
  		let rect = e.target.getBoundingClientRect();
  		const EspacioExcluido = GetSpaceBetweenTextAndElement(e.target).left;
  		if (!(isColumnCero && e.clientX <= (rect.left + EspacioExcluido))) {
        let CellInfo = Tabla.cell(GetCellNode(e.target));
        let isColumnEditable = ColumnsEditIndx.includes(CellInfo.column(GetCellNode(e.target)).index());
        if (CellInfo.length === 0 || !isColumnEditable) return; else CancelEvent(e);
        InsertInputInCell(e.target);
  		}
    }
 
    function CancelEvent(e) { e.stopPropagation(); }
 
    function InsertInputInCell(target) {
      let Cell = GetCellNode(target); 
      CellInput = ConstructCellInput(Cell);
      let Type =  ColumnsTypeData.find(ColumnInfo => ColumnInfo.idx === Tabla.column(Cell).index()).type;
      CellInput.attr('type', TypesInput[Type]);
      Cell.addClass('DataTableCellEditable').html(CellInput);
      FocusCellInput(Cell);
    }
 
    function GetCellNode(Element) {
      let CellInfo = Tabla.cell(Element);
      let Cell = undefined;
      let isResponsive = Tabla.responsive.hasHidden();
 
      if (isResponsive && ($(Element).is('span.dtr-data') || $(Element).closest('span.dtr-data').length))
        Cell = $(Element).closest('span.dtr-data');
      else if (($(Element).is('td') || $(Element).closest('td').length)) 
        Cell = $(Element).closest('td');
      else
        Cell = $(CellInfo.node());
      return Cell;
    }
 
    function ConstructCellInput(Cell) {
      let CellText = Cell.text();
      let CellWidth = Cell.innerWidth();
      let CellHeight = Cell.innerHeight();
      let PaddingCell = { start: Cell.css('padding-inline-start'), end: Cell.css('padding-inline-end') };
      let MarginStart = '0px !important';
      let FloatInput = 'none';
      if (Tabla.column(Cell).index() === 0 && Tabla.responsive.hasHidden()) {
        CellWidth -= parseFloat(PaddingCell.start);
        MarginStart = PaddingCell.start;
        PaddingCell.start = '0px';
        FloatInput = 'right'; 
      } 
      let CellInput = $(Input);
      CellInput.css({'width': CellWidth , 'height': CellHeight , 
        'padding-inline-start': PaddingCell.start, 
        'margin-inline-start': MarginStart,
        'padding-inline-end': PaddingCell.end, 'float': FloatInput});
      CellInput.val(CellText).blur(() => RemoveInput(Cell));
      if (Cell.is('span')) CellInput.css('width', 'fit-content');
      return CellInput;
    }
 
    function GetSpaceBetweenTextAndElement(Cell) {
      const padre = Cell;
      const range = document.createRange();
      range.selectNodeContents(padre);
      const textoRect = range.getBoundingClientRect();
      const posPadre = padre.getBoundingClientRect();
      return { 
        left: textoRect.left - posPadre.left,
        top: textoRect.top - posPadre.top,
        right: posPadre.right - textoRect.right,
        bottom: posPadre.bottom - textoRect.bottom
      }
    }
 
    function SaveInputText(Cell, Value) {
      if (Tabla.cell(Cell).data() !== Value && SAVEHISTORY) 
        Tabla.history.push({ Row: Tabla.row(Cell).index(), Data: structuredClone(Tabla.row(Cell).data()) });
 
      Tabla.cell(Cell).data(Value);
 
    }
 
    function RemoveInput(Cell, Save = false) {
      $(Cell).find('input').off('blur');
      $(Cell).removeClass('DataTableCellEditable');
      if (SAVEONCLOSE || Save) {
        let NewText = $(Cell).find('input').val();
        SaveInputText(Cell, NewText);
        Tabla.trigger("editdatatable.on.savedata", { Table: Tabla, Row: Tabla.row(Cell), Data: Tabla.row(Cell).data() });
      }
      if ($(Cell).is('span.dtr-data')) {
        let CellNode = $(Tabla.cell(Cell).node()).children().clone();
        if (CellNode.length === 0) CellNode = Tabla.cell(Cell).data();
        Cell.html(CellNode);
      }
    }
 
    function FocusCellInput(Cell) {
      let Input = Cell.find('input');
      Input.focus();
    }
 
    return Tabla;
  }
})(jQuery);
 
TablaSolicitudes = $('#TablaSolicitudes').EditDataTable(Structure);
 
// Propiedades de la tabla
/*
{
  columns: [ 
    { editable: true || false }
  ],
  saveOnBlur: true || false,
  history: true || false
}
 
*/
