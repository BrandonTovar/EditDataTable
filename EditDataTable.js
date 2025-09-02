(function ($) {
    // Inyección de estilos CSS
    $("head").append(
        $(`<style>
    td:has(span[name="TagCellEditDataTable"]), 
    span.dtr-data:has(span[name="TagCellEditDataTable"]) {
      position: relative;
    }
    span .dtr-details {
      width: 100%;
    }
    .DataTableCellEditable {
      padding: 0 !important;
      max-width: fit-content;
      min-width: fit-content;
      width: 0;
    }
  </style>`)
    );

    $.fn.EditDataTable = function (InitObject) {
        // Verifica si DataTable está definido y si el elemento es una tabla
        if (!$.fn.DataTable || !$(this).is("table")) return;

        const Tabla = this.DataTable(InitObject);
        if (!Tabla) return;

        // Configuración de opciones de historial y guardado
        const { history: SAVEHISTORY = false, saveOnBlur: SAVEONCLOSE = false } =
            InitObject || {};
        Tabla.history = SAVEHISTORY ? [] : null;

        // Plantillas para el campo de entrada y el icono de edición
        const InputTemplate = `<input autocomplete="off" name="InputEditCellDataTable" style="background-color:transparent; border: solid 0;"></input>`;
        const TagEditTemplate = `<span name="TagCellEditDataTable" style="opacity:0.5; align-content:center; position: absolute; right: 0; background: var(--primary); top: 0; width: 1rem; height: 1rem; font-size: 0.9rem; border-radius: 0 0 0 3px; color: white; text-align: center;" class="la la-pencil"></span>`;

        // Tipos de datos que pueden ser editados
        const TypesInput = {
            num: "number",
            "num-fmt": "number",
            "html-num": "number",
            "html-num-fmt": "number",
            date: "date",
            html: "text",
            "string-utf8": "text",
            string: "text",
        };

        // Filtra las columnas editables
        const ColumnsEdit = Tabla.settings()[0].aoColumns.filter(
            (column) => column.editable
        );
        const ColumnsEditIndx = ColumnsEdit.map((column) => column.idx);
        const ColumnsTypeData = ColumnsEdit.map((column) => ({
            idx: column.idx,
            type: column.sType,
        }));

        // Elementos que no son editables
        const ELemetsNoEditables = `
		  button, input, select, textarea, option, label, fieldset, legend, datalist, output,
		  a[href], area[href],
		  details, summary, dialog,
		  audio[controls], video[controls], [contenteditable],
		  [role="button"], [role="link"],
		  iframe, object, embed
		`;

        // Manejo de eventos
        $(this)
            .find("tbody")
            .get(0)
            .addEventListener("click", InsertInputEdit, true);
        $(this)
            .find("tbody")
            .get(0)
            .addEventListener(
                "keyup",
                (e) => {
                    CancelEvent(e);
                    ApplyChangeCell(e);
                },
                true
            );

        // Evento mouseenter para mostrar el icono de edición
        Tabla.on("mouseenter", "td, span.dtr-data", function (e) {
            if (e.target.matches(ELemetsNoEditables)) return;
            $('span[name="TagCellEditDataTable"]').remove();
            const CellInfo = Tabla.cell(GetCellNode(e.target));
            if (
                CellInfo.length &&
                ColumnsEditIndx.includes(CellInfo.column(e.target).index())
            ) {
                const CellNode = GetCellNode(e.target);
                $(CellNode).append(TagEditTemplate);
            }
        }).on("mouseleave", "td, span.dtr-data", function () {
            $('span[name="TagCellEditDataTable"]').remove();
        });

        /**
         * Aplica el cambio en la celda cuando se presiona "Enter".
         * @param {KeyboardEvent} e - El evento de teclado.
         */
        function ApplyChangeCell(e) {
            if (e.key === "Enter") {
                const Cell = GetCellNode(e.target);
                if (Cell) RemoveInput(Cell, true);
            }
        }
        /**
         * Inserta un campo de entrada en la celda seleccionada.
         * @param {MouseEvent} e - El evento de clic.
         */
        function InsertInputEdit(e) {
            if (e.target.matches(ELemetsNoEditables)) return;

            const isColumnCero = Tabla.column(GetCellNode(e.target)).index() === 0;
            const rect = e.target.getBoundingClientRect();
            const EspacioExcluido = GetSpaceBetweenTextAndElement(e.target).left;

            // Verifica si se debe insertar el campo de entrada
            if (!(isColumnCero && e.clientX <= rect.left + EspacioExcluido)) {
                const CellInfo = Tabla.cell(GetCellNode(e.target));
                if (
                    CellInfo.length &&
                    ColumnsEditIndx.includes(
                        CellInfo.column(GetCellNode(e.target)).index()
                    )
                ) {
                    CancelEvent(e);
                    InsertInputInCell(e.target);
                }
            }
        }

        /**
         * Cancela la propagación del evento.
         * @param {Event} e - El evento a cancelar.
         */
        function CancelEvent(e) {
            e.stopPropagation();
        }

        /**
         * Inserta un campo de entrada en la celda especificada.
         * @param {HTMLElement} target - El elemento de la celda donde se insertará el campo de entrada.
         */
        function InsertInputInCell(target) {
            const Cell = GetCellNode(target);
            const CellInput = ConstructCellInput(Cell);
            const Type = ColumnsTypeData.find(
                (ColumnInfo) => ColumnInfo.idx === Tabla.column(Cell).index()
            ).type;

            CellInput.attr("type", TypesInput[Type]);
            Cell.addClass("DataTableCellEditable").html(CellInput);
            FocusCellInput(Cell);
        }

        /**
         * Obtiene el nodo de la celda correspondiente al elemento dado.
         * @param {HTMLElement} Element - El elemento del que se quiere obtener la celda.
         * @returns {HTMLElement} - El nodo de la celda.
         */
        function GetCellNode(Element) {
            const CellInfo = Tabla.cell(Element);
            let Cell;

            const isResponsive = Tabla?.responsive?.hasHidden?.() ?? false;
            if (
                isResponsive &&
                ($(Element).is("span.dtr-data") ||
                    $(Element).closest("span.dtr-data").length)
            ) {
                Cell = $(Element).closest("span.dtr-data");
            } else if ($(Element).is("td") || $(Element).closest("td").length) {
                Cell = $(Element).closest("td");
            } else {
                Cell = $(CellInfo.node());
            }
            return Cell;
        }

        /**
         * Crea un campo de entrada para la celda especificada.
         * @param {HTMLElement} Cell - La celda donde se insertará el campo de entrada.
         * @returns {jQuery} - El campo de entrada creado.
         */
        function ConstructCellInput(Cell) {
            const CellText = Cell.text();
            const CellWidth = Cell.innerWidth();
            const CellHeight = Cell.innerHeight();
            const PaddingCell = {
                start: Cell.css("padding-inline-start"),
                end: Cell.css("padding-inline-end"),
            };
            let MarginStart = "0px !important";
            let FloatInput = "none";

            if (
                Tabla.column(Cell).index() === 0 &&
                (Tabla?.responsive?.hasHidden?.() ?? false)
            ) {
                CellWidth -= parseFloat(PaddingCell.start);
                MarginStart = PaddingCell.start;
                PaddingCell.start = "0px";
                FloatInput = "right";
            }

            const CellInput = $(InputTemplate);
            CellInput.css({
                width: CellWidth,
                height: CellHeight,
                "padding-inline-start": PaddingCell.start,
                "margin-inline-start": MarginStart,
                "padding-inline-end": PaddingCell.end,
                float: FloatInput,
            });
            CellInput.val(CellText).get(0).onblur = () => RemoveInput(Cell);
            if (Cell.is("span")) CellInput.css("width", "fit-content");
            return CellInput;
        }

        /**
         * Calcula el espacio entre el texto y el elemento de la celda.
         * @param {HTMLElement} Cell - La celda de la que se quiere calcular el espacio.
         * @returns {Object} - Un objeto con las dimensiones del espacio.
         */
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
                bottom: posPadre.bottom - textoRect.bottom,
            };
        }

        /**
         * Guarda el texto ingresado en la celda.
         * @param {HTMLElement} Cell - La celda donde se guardará el nuevo valor.
         * @param {string} Value - El nuevo valor a guardar.
         */
        function SaveInputText(Cell, Value) {
            const Type = ColumnsTypeData.find(
                (ColumnInfo) => ColumnInfo.idx === Tabla.column(Cell).index()
            ).type;

            if (!ValidateInput(Value, Type)) {
                alert("El valor ingresado no es válido."); // Notificación al usuario
                return;
            }

            if (Tabla.cell(Cell).data() !== Value && SAVEHISTORY) {
                Tabla.history.push({
                    Row: Tabla.row(Cell).index(),
                    Data: structuredClone(Tabla.row(Cell).data()),
                });
            }
            Tabla.cell(Cell).data(Value);
        }

        /**
         * Valida el valor ingresado en la celda.
         * @param {string} value - El valor a validar.
         * @param {string} type - El tipo de dato esperado.
         * @returns {boolean} - Retorna true si el valor es válido, false en caso contrario.
         */
        function ValidateInput(value, type) {
            switch (type) {
                case "number":
                    return !isNaN(value) && value.trim() !== "";
                case "date":
                    return !isNaN(Date.parse(value));
                case "string":
                    return true; // Siempre válido para texto
                default:
                    return false;
            }
        }

        /**
         * Elimina el campo de entrada de la celda y actualiza el contenido.
         * @param {HTMLElement} Cell - La celda de la que se eliminará el campo de entrada.
         * @param {boolean} [Save=false] - Indica si se debe guardar el nuevo valor.
         */
        function RemoveInput(Cell, Save = false) {
            if (SAVEONCLOSE || Save) {
                const NewText = $(Cell).find("input").val();
                SaveInputText(Cell, NewText);
                let TableElement = Tabla?.context?.at?.()?.nTable;
                if (TableElement)
                    $(Tabla).trigger("editdatatable.on.savedata", {
                        Table: Tabla,
                        Row: Tabla.row(Cell),
                        Data: Tabla.row(Cell).data(),
                    });
            }

            if ($(Cell).is("span.dtr-data")) {
                let CellNode = $(Tabla.cell(Cell).node()).children().clone();
                if (CellNode.length === 0) CellNode = Tabla.cell(Cell).data();
                Cell.html(CellNode);
            }
            else {
                Cell.html(Tabla.cell(Cell).data());
            }

            $(Cell).removeClass("DataTableCellEditable");
        }

        /**
         * Enfoca el campo de entrada en la celda.
         * @param {HTMLElement} Cell - La celda que contiene el campo de entrada.
         */
        function FocusCellInput(Cell) {
            const Input = Cell.find("input");
            Input.focus();
        }

        return Tabla; // Devuelve la instancia de la tabla
    };
})(jQuery);

// Ejemplo de uso del plugin
//TablaSolicitudes = $("#TablaSolicitudes").EditDataTable(Structure);

/*
Propiedades de la tabla
{
  columns: [ 
    { editable: true | false }
  ],
  saveOnBlur: true | false,
  history: true | false
}
*/
