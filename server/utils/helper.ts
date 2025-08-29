export function cleanAIResponse(raw:string) {
  let text = "";

  try {
    let obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    text = obj.data || "";
  } catch (e) {
 
    const match = /"data"\s*:\s*"([\s\S]*)"/.exec(raw);
    if (match) {
      text = match[1]!;
    } else {
      text = raw; 
    }
  }

  text = text.replace(/\\n/g, "\n").trim();
  return text;
}

