import re

with open("frontend/modules/dashboard/affiliate/components/AffiliaProAffiliateProfilePage.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Comment out Selfie With ID
content = content.replace(
    '{ name: "Selfie With ID", file: "selfie_id.jpg", date: "Uploaded May 12, 2023" },',
    '// { name: "Selfie With ID", file: "selfie_id.jpg", date: "Uploaded May 12, 2023" },'
)

# Extract Identity Verification
identity_match = re.search(r'(\s*<section id="identity".*?</section>)', content, re.DOTALL)
identity_str = identity_match.group(1)

# Extract Preferences
preferences_match = re.search(r'(\s*<section id="preferences".*?</section>)', content, re.DOTALL)
preferences_str = preferences_match.group(1)

# Extract Security
security_match = re.search(r'(\s*<section id="security".*?</section>)', content, re.DOTALL)
security_str = security_match.group(1)

# Extract Devices
devices_match = re.search(r'(\s*<section id="devices".*?</section>)', content, re.DOTALL)
devices_str = devices_match.group(1)

# Now, remove them from their original places
content = content.replace(identity_str, "")
content = content.replace(preferences_str, "")
content = content.replace(security_str, "")
content = content.replace(devices_str, "")

# We need to insert the new grids right after Main Profile Columns.
main_cols_end_match = re.search(r'(            \{/\* Right Column: Contact \+ Address \*/\}.*?            </section>\n            </div>\n          </div>)', content, re.DOTALL)
main_cols_end_str = main_cols_end_match.group(1)

new_grids = f"""
          {{/* Identity + Preferences */}}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">{identity_str}{preferences_str}
          </div>

          {{/* Devices + Security */}}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">{devices_str}{security_str}
          </div>
"""

content = content.replace(main_cols_end_str, main_cols_end_str + "\n" + new_grids)

# Now remove the empty wrappers that used to hold Preferences, Security, Devices
empty_pref_sec = r'\s*\{/\* Preferences \+ Security \*/\}\s*<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">\s*</div>'
content = re.sub(empty_pref_sec, "", content)

empty_devices = r'\s*\{/\* Devices \*/\}\s*<div className="flex flex-col gap-5">\s*</div>'
content = re.sub(empty_devices, "", content)

with open("frontend/modules/dashboard/affiliate/components/AffiliaProAffiliateProfilePage.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Restructured successfully.")
