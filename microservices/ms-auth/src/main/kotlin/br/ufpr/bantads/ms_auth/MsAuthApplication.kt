package br.ufpr.bantads.ms_auth

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class MsAuthApplication

fun main(args: Array<String>) {
	runApplication<MsAuthApplication>(*args)
}
