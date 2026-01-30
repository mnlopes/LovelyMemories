import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fullName, email, phoneNumber, address, location, plan, numProperties } = body;

        // Aqui seria a integração com Resend, SendGrid ou SMTP
        console.log("Novo Lead de Proprietário Recebido:", {
            fullName,
            email,
            phoneNumber,
            address,
            location,
            plan,
            numProperties
        });

        // Simulação de sucesso
        return NextResponse.json({ message: 'Success' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
    }
}
