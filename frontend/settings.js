import { FieldType } from "@airtable/blocks/models";
import { useBase, useGlobalConfig, useRecords } from "@airtable/blocks/ui";

export const ConfigKeys = {
  TABLE_ID: "tableId",
  VIEW_ID: "viewId",
  FIELD_ID: "fieldId",
  FIELD_TYPE: "fieldTypeId",
  LINKED_FIELD1: "table1Id",
  //   VIEW1_ID: "view1Id",
  FIELD1_ID: "field1Id",
  FIELD1_1_ID: "field11Id",
  LINKED_FIELD2: "table2Id",
  //   VIEW2_ID: "view2Id",
  FIELD2_ID: "field2Id",
  FIELD2_2_ID: "field22Id",
  CHART_ORIENTATION: "chartOrientation",
  LINK_STYLE: "linkStyle",
  RECORD_SHAPE: "recordShape",
};

export const allowedFieldTypes = [
  FieldType.MULTIPLE_RECORD_LINKS,
  FieldType.MULTIPLE_LOOKUP_VALUES,
  FieldType.SINGLE_SELECT,
];

export const RecordShape = Object.freeze({
  ROUNDED: "rounded",
  RECTANGLE: "rectangle",
  ELLIPSE: "ellipse",
  CIRCLE: "circle",
  DIAMOND: "diamond",
});

export const LinkStyle = Object.freeze({
  RIGHT_ANGLES: "rightAngles",
  STRAIGHT_LINES: "straightLines",
});

export const ChartOrientation = Object.freeze({
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
});

const defaults = Object.freeze({
  [ConfigKeys.CHART_ORIENTATION]: ChartOrientation.VERTICAL,
  [ConfigKeys.LINK_STYLE]: LinkStyle.RIGHT_ANGLES,
  [ConfigKeys.RECORD_SHAPE]: RecordShape.ROUNDED,
});

/**
 * Reads the values stored in GlobalConfig and inserts defaults for missing values
 * @param {GlobalConfig} globalConfig
 * @returns {{
 *     tableId?: string,
 *     viewId?: string,
 *     fieldId?: string,
 *     table1Id?: string,
 *     table2Id?: string,
 *     chartOrientation: ChartOrientation,
 *     linkStyle: LinkStyle,
 *     recordShape: RecordShape,
 * }}
 */
function getRawSettingsWithDefaults(globalConfig) {
  const rawSettings = {};
  for (const globalConfigKey of Object.values(ConfigKeys)) {
    const storedValue = globalConfig.get(globalConfigKey);
    if (
      storedValue === undefined &&
      Object.prototype.hasOwnProperty.call(defaults, globalConfigKey)
    ) {
      rawSettings[globalConfigKey] = defaults[globalConfigKey];
    } else {
      rawSettings[globalConfigKey] = storedValue;
    }
  }

  return rawSettings;
}

/**
 * Takes values read from GlobalConfig and converts them to Airtable objects where possible.
 * Also creates an extra key for queryResult which is derived from view and field.
 * @param {object} rawSettings - The object returned by getRawSettingsWithDefaults
 * @param {Base} base - The base being used by the app in order to convert id's to objects
 * @returns {{
 *     table: Table | null,
 *     view: View | null,
 *     field: Field | null,
 *     fieldType: Field | null,
 *     table1: Table | null,
 *     table2: Table | null,
 *     field1: Field | null,
 *     field2: Field | null,
 *     field11: Field | null,
 *     field22: Field | null,
 *     queryResult: RecordQueryResult | null,
 *     queryResult1: RecordQueryResult | null,
 *     queryResult2: RecordQueryResult | null,
 *     chartOrientation: ChartOrientation,
 *     linkStyle: LinkStyle,
 *     recordShape: RecordShape,
 * }}
 */
function getSettings(rawSettings, base) {
  const table = base.getTableByIdIfExists(rawSettings.tableId);
  const view = table ? table.getViewByIdIfExists(rawSettings.viewId) : null;
  const field = table ? table.getFieldByIdIfExists(rawSettings.fieldId) : null;
  const fieldType =
    table && rawSettings.fieldTypeId
      ? table.getFieldByIdIfExists(rawSettings.fieldTypeId)
      : null;
  const table1 = rawSettings.table1Id
    ? base.getTableByIdIfExists(rawSettings.table1Id)
    : null;
  const table2 = rawSettings.table2Id
    ? base.getTableByIdIfExists(rawSettings.table2Id)
    : null;
  const field1 =
    table1 && rawSettings.field1Id
      ? table1.getFieldByIdIfExists(rawSettings.field1Id)
      : null;
  const field11 =
    table1 && rawSettings.field11Id
      ? table1.getFieldByIdIfExists(rawSettings.field11Id)
      : null;
  const field2 =
    table2 && rawSettings.field2Id
      ? table2.getFieldByIdIfExists(rawSettings.field2Id)
      : null;
  const field22 =
    table2 && rawSettings.field22Id
      ? table2.getFieldByIdIfExists(rawSettings.field22Id)
      : null;
  const queryResult =
    view && field
      ? view.selectRecords({
          fields: [table.primaryField, field.id, fieldType && fieldType.id],
        })
      : null;

  const queryResult1 =
    field11 && field1
      ? useRecords(table1, {
          fields: [field1.id, field11.id],
        })
      : null;

  const queryResult2 =
    field22 && field2
      ? useRecords(table2, {
          fields: [field2.id, field22.id],
        })
      : null;

  return {
    table,
    table1,
    table2,
    view,
    field,
    fieldType,
    field1,
    field11,
    field2,
    field22,
    queryResult,
    queryResult1,
    queryResult2,
    chartOrientation: rawSettings.chartOrientation,
    linkStyle: rawSettings.linkStyle,
    recordShape: rawSettings.recordShape,
  };
}

/**
 * Wraps the settings with validation information
 * @param {object} settings - The object returned by getSettings
 * @returns {{settings: object, isValid: boolean} | {settings: object, isValid: boolean, message: string}}
 */
function getSettingsValidationResult(settings) {
  const { queryResult, field1, field2, field, field22, field11 } = settings;
  if (!queryResult) {
    return {
      isValid: false,
      message: "Pick a table, view, and linked record field",
      settings: settings,
    };
  } else if (
    field &&
    field1 &&
    field2 &&
    field11 &&
    field22 &&
    field.type !== FieldType.MULTIPLE_RECORD_LINKS &&
    field1.type !== FieldType.MULTIPLE_RECORD_LINKS &&
    field11.type !== FieldType.MULTIPLE_RECORD_LINKS &&
    field2.type !== FieldType.MULTIPLE_RECORD_LINKS &&
    field22.type !== FieldType.MULTIPLE_RECORD_LINKS
  ) {
    return {
      isValid: false,
      message: "Select a linked record field",
      settings: settings,
    };
  }
  //   else if (field1.options.linkedTableId !== table1.id) {
  //     return {
  //       isValid: false,
  //       message: "Linked record field must be linked to same table",
  //       settings: settings,
  //     };
  //   }
  return {
    isValid: true,
    settings: settings,
  };
}

/**
 * A React hook to validate and access settings configured in SettingsForm.
 * @returns {{settings: object, isValid: boolean, message: string} | {settings: object, isValid: boolean}}
 */
export function useSettings() {
  const base = useBase();
  const globalConfig = useGlobalConfig();
  const rawSettings = getRawSettingsWithDefaults(globalConfig);
  const settings = getSettings(rawSettings, base);
  return getSettingsValidationResult(settings);
}
