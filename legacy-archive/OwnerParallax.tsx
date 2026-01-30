"use client";

import { useEffect, useRef } from "react";

export const OwnerParallax = () => {
    // Refs para performance (não causar re-renders)
    const requestRef = useRef<number>(undefined);

    useEffect(() => {
        // Seletores baseados na ordem do DOM no legacy-home-body.html
        // #1: Esquerda (img-1)
        // #2: Baixo Direita (img-2) - "Mais baixa a subir um pouco"
        // #3: Cima Direita (img-3) - "Mais alta a descer um pouco"

        const imgLeft = document.querySelector('.owner-images__img:nth-child(1)') as HTMLElement;
        const imgBottom = document.querySelector('.owner-images__img:nth-child(2)') as HTMLElement;
        const imgTop = document.querySelector('.owner-images__img:nth-child(3)') as HTMLElement;
        const section = document.querySelector('.section-owner') as HTMLElement;

        if (!imgLeft || !imgBottom || !imgTop || !section) return;

        // Configuração inicial CSS para garantir escala exata e suavidade via GPU
        imgLeft.style.width = '400px';
        imgLeft.style.height = '400px';

        imgBottom.style.width = '400px';
        imgBottom.style.height = '400px';

        imgTop.style.width = '300px';
        imgTop.style.height = '450px';

        [imgLeft, imgBottom, imgTop].forEach(el => {
            el.style.willChange = 'transform';
            el.style.opacity = '1';
        });

        const updateParallax = () => {
            const rect = section.getBoundingClientRect();
            const viewHeight = window.innerHeight;

            // Verifica se a secção está visível (viewport + buffer)
            if (rect.top < viewHeight && rect.bottom > 0) {
                // Calcula progresso relativo (0 = topo da secção entra, 1 = topo da secção sai?)
                // Scroll relativo ao centro da secção pode ser melhor
                // Vamos usar deslocamento simples baseado no scroll

                // Qunado rect.top é positivo (abaixo), scrollY é menor.
                // Queremos mover baseado no movimento.

                // Fator de velocidade
                const speed = 0.15;

                // Offset calculation
                // Usamos rect.top que altera com o scroll
                // Imagem de cima (imgTop) deve DESCER (ir para baixo) -> translateY positivo conforme scroll desce?
                // Se scroll DESCE (user navega pa baixo), rect.top diminui (fica negativo).
                // Se queremos que a imagem DESÇA visualmente (acompanhe o scroll ou mova mais rapido para baixo?),
                // "Descer um pouco": aumentar Y.
                // rect.top * speed * -1 -> aumenta Y

                const moveDown = (viewHeight - rect.top) * speed * 0.5; // Top Image
                const moveUp = (viewHeight - rect.top) * speed * -0.8; // Bottom Image (negative Y)

                imgTop.style.transform = `translate3d(0, ${moveDown}px, 0)`;
                imgBottom.style.transform = `translate3d(0, ${moveUp}px, 0)`;
            }

            requestRef.current = requestAnimationFrame(updateParallax);
        };

        requestRef.current = requestAnimationFrame(updateParallax);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return null;
};
