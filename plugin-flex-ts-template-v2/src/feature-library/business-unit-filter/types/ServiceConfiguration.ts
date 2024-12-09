export default interface BusinessUnitFilterConfig {
  enabled: boolean;
  tech_lead_view: boolean;
  business_units?: Record<string, string[]>;
}
