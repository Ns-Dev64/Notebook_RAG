import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";

let splitter: RecursiveCharacterTextSplitter | null = null;

async function getSplitter() {

    if (splitter) return splitter;

    splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n\n", "\n", " ", ""]
    });

    return splitter;

}


export async function split(filepath:string,type:string){

    const splitter=await getSplitter();

    if(type==="application/pdf"){
        const loader=new PDFLoader(filepath);
        const docs=await loader.load();
        return await splitter.splitDocuments(docs);
    }
    else if(type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
        const loader=new DocxLoader(filepath);
        const docs=await loader.load();
        return await splitter.splitDocuments(docs);
    }
    else if(type==="application/vnd.openxmlformats-officedocument.presentationml.presentation"){
        const loader= new PPTXLoader(filepath);
        const docs=await loader.load();
        return await splitter.splitDocuments(docs);
    }

    else return '';

}


export async function textsplitter(text:string) {

    const splitter=await getSplitter();

    return await splitter.splitText(text);
    
}